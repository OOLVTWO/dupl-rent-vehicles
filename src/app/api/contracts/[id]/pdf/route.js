import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/apiAuth';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';

const BUSINESS_NAME = 'Demo Rental Preview';
const BUSINESS_ADDRESS = 'Sample Address, Bali, Indonesia';
const ACCENT = '#B8703F';
const INK = '#1E293B';
const MUTED = '#64748B';
const LINE = '#E2E8F0';
const SURFACE = '#F8FAFC';

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return d;
  }
}

function b64ToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const parts = dataUrl.split(',');
  try {
    return Buffer.from(parts[1] || parts[0], 'base64');
  } catch {
    return null;
  }
}

function buildContractPdf(contract) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const PAGE_W = 595.28;
    const M = 50;
    const CONTENT_W = PAGE_W - M * 2;

    // ===== Header band =====
    doc.rect(0, 0, PAGE_W, 110).fill(INK);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(BUSINESS_NAME, M, 32);
    doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1').text(BUSINESS_ADDRESS, M, 58);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text('RENTAL AGREEMENT', M, 78, { characterSpacing: 1.2 });

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('CONTRACT', PAGE_W - M - 200, 32, { width: 200, align: 'right' });
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text('ID: ' + String(contract.id).slice(0, 8).toUpperCase(), PAGE_W - M - 200, 50, { width: 200, align: 'right' });
    doc.text('Issued: ' + fmtDate(contract.created_at), PAGE_W - M - 200, 63, { width: 200, align: 'right' });

    let y = 140;

    const sectionTitle = (text, yy) => {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT).text(text.toUpperCase(), M, yy, { characterSpacing: 0.8 });
      doc.moveTo(M, yy + 16).lineTo(PAGE_W - M, yy + 16).strokeColor(LINE).lineWidth(1).stroke();
      return yy + 28;
    };

    const kv = (label, value, x, yy, w) => {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label.toUpperCase(), x, yy, { width: w, characterSpacing: 0.5 });
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(value || '-', x, yy + 12, { width: w });
    };

    // ===== Customer details =====
    y = sectionTitle('Customer Details', y);
    const colW = (CONTENT_W - 20) / 2;
    kv('Full Name', contract.customer_name, M, y, colW);
    kv('ID / Passport No.', contract.customer_id_number, M + colW + 20, y, colW);
    y += 40;
    kv('Phone / WhatsApp', contract.customer_phone, M, y, colW);
    kv('Address', contract.customer_address, M + colW + 20, y, colW);
    y += 50;

    // ===== Rental details (boxed) =====
    y = sectionTitle('Rental Details', y);
    doc.roundedRect(M, y, CONTENT_W, 60, 6).fillAndStroke(SURFACE, LINE);
    kv('Vehicle', contract.vehicle_name, M + 16, y + 14, colW);
    kv('Rental Period', `${fmtDate(contract.start_date)}  to  ${fmtDate(contract.end_date)}`, M + colW + 20, y + 14, colW);
    y += 76;

    if (contract.notes) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Notes: ', M, y, { continued: true });
      doc.fillColor(INK).text(contract.notes, { width: CONTENT_W - 40 });
      y = doc.y + 16;
    }

    // ===== Documentation photos =====
    y = sectionTitle('Documentation', y);
    const photoW = (CONTENT_W - 20) / 2;
    const photoH = 130;
    [
      ['Passport / ID Photo', contract.passport_photo_url],
      ['Customer With Vehicle', contract.customer_vehicle_photo_url],
    ].forEach(([label, url], i) => {
      const x = M + i * (photoW + 20);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(label.toUpperCase(), x, y, { characterSpacing: 0.5 });
      const buf = b64ToBuffer(url);
      doc.roundedRect(x, y + 12, photoW, photoH, 4).fillAndStroke(SURFACE, LINE);
      if (buf) {
        try {
          doc.image(buf, x, y + 12, { fit: [photoW, photoH], align: 'left' });
        } catch {
          doc.fontSize(8).fillColor(MUTED).text('Image could not be rendered', x, y + 12 + photoH / 2 - 4, { width: photoW, align: 'center' });
        }
      } else {
        doc.fontSize(8).fillColor(MUTED).text('No photo provided', x, y + 12 + photoH / 2 - 4, { width: photoW, align: 'center' });
      }
    });
    y += 12 + photoH + 24;

    // ===== Signature =====
    y = sectionTitle('Customer Signature', y);
    const sigBuf = b64ToBuffer(contract.signature_url);
    doc.roundedRect(M, y, 220, 90, 6).fillAndStroke('#FFFFFF', LINE);
    if (sigBuf) {
      try {
        doc.image(sigBuf, M + 10, y + 8, { fit: [200, 60] });
      } catch { /* leave box empty if signature image fails to decode */ }
    }
    doc.moveTo(M + 10, y + 74).lineTo(M + 210, y + 74).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(contract.customer_name, M + 10, y + 78);

    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text('Recorded by:', M + 260, y + 8);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(contract.created_by_name || '-', M + 260, y + 20);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(
      'This contract was signed digitally on-site at the time of vehicle handover, and is a valid proof of rental agreement.',
      M + 260, y + 40, { width: 200 }
    );

    // ===== Footer =====
    const footerY = 800;
    doc.moveTo(M, footerY).lineTo(PAGE_W - M, footerY).strokeColor(LINE).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(
      `${BUSINESS_NAME} — ${BUSINESS_ADDRESS}  |  Generated ${new Date().toLocaleString('en-GB')}`,
      M, footerY + 8, { width: CONTENT_W, align: 'center' }
    );

    doc.end();
  });
}

// GET /api/contracts/[id]/pdf — hasilkan PDF kontrak rapi (admin & driver boleh)
export async function GET(request, { params }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();
  const { data: contract, error } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle();

  if (error || !contract) {
    return new Response('Kontrak tidak ditemukan.', { status: 404 });
  }

  try {
    const pdfBuffer = await buildContractPdf(contract);
    const safeName = (contract.customer_name || 'contract').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contract-${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return new Response('Gagal membuat PDF kontrak.', { status: 500 });
  }
}
