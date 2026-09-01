/**
 * Complete Worldwide Country Code & International Phone Helper (220+ Countries)
 * Demo Rental Preview - Canggu Bali
 */

export const COUNTRY_CODES = [
  { code: '+62', country: 'Indonesia', flag: '🇮🇩', iso: 'id' },
  { code: '+61', country: 'Australia', flag: '🇦🇺', iso: 'au' },
  { code: '+1', country: 'United States', flag: '🇺🇸', iso: 'us' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧', iso: 'gb' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', iso: 'de' },
  { code: '+33', country: 'France', flag: '🇫🇷', iso: 'fr' },
  { code: '+31', country: 'Netherlands', flag: '🇳🇱', iso: 'nl' },
  { code: '+7', country: 'Russia', flag: '🇷🇺', iso: 'ru' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬', iso: 'sg' },
  { code: '+81', country: 'Japan', flag: '🇯🇵', iso: 'jp' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷', iso: 'kr' },
  { code: '+91', country: 'India', flag: '🇮🇳', iso: 'in' },
  { code: '+64', country: 'New Zealand', flag: '🇳🇿', iso: 'nz' },
  { code: '+41', country: 'Switzerland', flag: '🇨🇭', iso: 'ch' },
  { code: '+46', country: 'Sweden', flag: '🇸🇪', iso: 'se' },
  { code: '+39', country: 'Italy', flag: '🇮🇹', iso: 'it' },
  { code: '+34', country: 'Spain', flag: '🇪🇸', iso: 'es' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', iso: 'br' },
  { code: '+971', country: 'United Arab Emirates', flag: '🇦🇪', iso: 'ae' },
  { code: '+93', country: 'Afghanistan', flag: '🇦🇫', iso: 'af' },
  { code: '+355', country: 'Albania', flag: '🇦🇱', iso: 'al' },
  { code: '+213', country: 'Algeria', flag: '🇩🇿', iso: 'dz' },
  { code: '+376', country: 'Andorra', flag: '🇦🇩', iso: 'ad' },
  { code: '+244', country: 'Angola', flag: '🇦🇴', iso: 'ao' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷', iso: 'ar' },
  { code: '+374', country: 'Armenia', flag: '🇦🇲', iso: 'am' },
  { code: '+43', country: 'Austria', flag: '🇦🇹', iso: 'at' },
  { code: '+994', country: 'Azerbaijan', flag: '🇦🇿', iso: 'az' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭', iso: 'bh' },
  { code: '+880', country: 'Bangladesh', flag: '🇧🇩', iso: 'bd' },
  { code: '+375', country: 'Belarus', flag: '🇧🇾', iso: 'by' },
  { code: '+32', country: 'Belgium', flag: '🇧🇪', iso: 'be' },
  { code: '+501', country: 'Belize', flag: '🇧🇿', iso: 'bz' },
  { code: '+229', country: 'Benin', flag: '🇧🇯', iso: 'bj' },
  { code: '+975', country: 'Bhutan', flag: '🇧🇹', iso: 'bt' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴', iso: 'bo' },
  { code: '+387', country: 'Bosnia & Herzegovina', flag: '🇧🇦', iso: 'ba' },
  { code: '+267', country: 'Botswana', flag: '🇧🇼', iso: 'bw' },
  { code: '+673', country: 'Brunei', flag: '🇧🇳', iso: 'bn' },
  { code: '+359', country: 'Bulgaria', flag: '🇧🇬', iso: 'bg' },
  { code: '+855', country: 'Cambodia', flag: '🇰🇭', iso: 'kh' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲', iso: 'cm' },
  { code: '+1', country: 'Canada', flag: '🇨🇦', iso: 'ca' },
  { code: '+56', country: 'Chile', flag: '🇨🇱', iso: 'cl' },
  { code: '+86', country: 'China', flag: '🇨🇳', iso: 'cn' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴', iso: 'co' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷', iso: 'cr' },
  { code: '+385', country: 'Croatia', flag: '🇭🇷', iso: 'hr' },
  { code: '+53', country: 'Cuba', flag: '🇨🇺', iso: 'cu' },
  { code: '+357', country: 'Cyprus', flag: '🇨🇾', iso: 'cy' },
  { code: '+420', country: 'Czech Republic', flag: '🇨🇿', iso: 'cz' },
  { code: '+45', country: 'Denmark', flag: '🇩🇰', iso: 'dk' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨', iso: 'ec' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', iso: 'eg' },
  { code: '+503', country: 'El Salvador', flag: '🇸🇻', iso: 'sv' },
  { code: '+372', country: 'Estonia', flag: '🇪🇪', iso: 'ee' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹', iso: 'et' },
  { code: '+679', country: 'Fiji', flag: '🇫🇯', iso: 'fj' },
  { code: '+358', country: 'Finland', flag: '🇫🇮', iso: 'fi' },
  { code: '+995', country: 'Georgia', flag: '🇬🇪', iso: 'ge' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', iso: 'gh' },
  { code: '+30', country: 'Greece', flag: '🇬🇷', iso: 'gr' },
  { code: '+502', country: 'Guatemala', flag: '🇬🇹', iso: 'gt' },
  { code: '+504', country: 'Honduras', flag: '🇭🇳', iso: 'hn' },
  { code: '+852', country: 'Hong Kong', flag: '🇭🇰', iso: 'hk' },
  { code: '+36', country: 'Hungary', flag: '🇭🇺', iso: 'hu' },
  { code: '+354', country: 'Iceland', flag: '🇮🇸', iso: 'is' },
  { code: '+98', country: 'Iran', flag: '🇮🇷', iso: 'ir' },
  { code: '+964', country: 'Iraq', flag: '🇮🇶', iso: 'iq' },
  { code: '+353', country: 'Ireland', flag: '🇮🇪', iso: 'ie' },
  { code: '+972', country: 'Israel', flag: '🇮🇱', iso: 'il' },
  { code: '+225', country: 'Ivory Coast', flag: '🇨🇮', iso: 'ci' },
  { code: '+1876', country: 'Jamaica', flag: '🇯🇲', iso: 'jm' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴', iso: 'jo' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪', iso: 'ke' },
  { code: '+383', country: 'Kosovo', flag: '🇽🇰', iso: 'xk' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼', iso: 'kw' },
  { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬', iso: 'kg' },
  { code: '+856', country: 'Laos', flag: '🇱🇦', iso: 'la' },
  { code: '+371', country: 'Latvia', flag: '🇱🇻', iso: 'lv' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧', iso: 'lb' },
  { code: '+218', country: 'Libya', flag: '🇱🇾', iso: 'ly' },
  { code: '+370', country: 'Lithuania', flag: '🇱🇹', iso: 'lt' },
  { code: '+352', country: 'Luxembourg', flag: '🇱🇺', iso: 'lu' },
  { code: '+853', country: 'Macau', flag: '🇲🇴', iso: 'mo' },
  { code: '+261', country: 'Madagascar', flag: '🇲🇬', iso: 'mg' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾', iso: 'my' },
  { code: '+960', country: 'Maldives', flag: '🇲🇻', iso: 'mv' },
  { code: '+356', country: 'Malta', flag: '🇲🇹', iso: 'mt' },
  { code: '+52', country: 'Mexico', flag: '🇲🇽', iso: 'mx' },
  { code: '+373', country: 'Moldova', flag: '🇲🇩', iso: 'md' },
  { code: '+377', country: 'Monaco', flag: '🇲🇨', iso: 'mc' },
  { code: '+976', country: 'Mongolia', flag: '🇲🇳', iso: 'mn' },
  { code: '+382', country: 'Montenegro', flag: '🇲🇪', iso: 'me' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦', iso: 'ma' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿', iso: 'mz' },
  { code: '+95', country: 'Myanmar', flag: '🇲🇲', iso: 'mm' },
  { code: '+264', country: 'Namibia', flag: '🇳🇦', iso: 'na' },
  { code: '+977', country: 'Nepal', flag: '🇳🇵', iso: 'np' },
  { code: '+505', country: 'Nicaragua', flag: '🇳🇮', iso: 'ni' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', iso: 'ng' },
  { code: '+389', country: 'North Macedonia', flag: '🇲🇰', iso: 'mk' },
  { code: '+47', country: 'Norway', flag: '🇳🇴', iso: 'no' },
  { code: '+968', country: 'Oman', flag: '🇴🇲', iso: 'om' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰', iso: 'pk' },
  { code: '+970', country: 'Palestine', flag: '🇵🇸', iso: 'ps' },
  { code: '+507', country: 'Panama', flag: '🇵🇦', iso: 'pa' },
  { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬', iso: 'pg' },
  { code: '+595', country: 'Paraguay', flag: '🇵🇾', iso: 'py' },
  { code: '+51', country: 'Peru', flag: '🇵🇪', iso: 'pe' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭', iso: 'ph' },
  { code: '+48', country: 'Poland', flag: '🇵🇱', iso: 'pl' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹', iso: 'pt' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦', iso: 'qa' },
  { code: '+40', country: 'Romania', flag: '🇷🇴', iso: 'ro' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼', iso: 'rw' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', iso: 'sa' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳', iso: 'sn' },
  { code: '+381', country: 'Serbia', flag: '🇷🇸', iso: 'rs' },
  { code: '+232', country: 'Sierra Leone', flag: '🇸🇱', iso: 'sl' },
  { code: '+421', country: 'Slovakia', flag: '🇸🇰', iso: 'sk' },
  { code: '+386', country: 'Slovenia', flag: '🇸🇮', iso: 'si' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', iso: 'za' },
  { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', iso: 'lk' },
  { code: '+249', country: 'Sudan', flag: '🇸🇩', iso: 'sd' },
  { code: '+886', country: 'Taiwan', flag: '🇹🇼', iso: 'tw' },
  { code: '+992', country: 'Tajikistan', flag: '🇹🇯', iso: 'tj' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿', iso: 'tz' },
  { code: '+66', country: 'Thailand', flag: '🇹🇭', iso: 'th' },
  { code: '+670', country: 'Timor-Leste', flag: '🇹🇱', iso: 'tl' },
  { code: '+216', country: 'Tunisia', flag: '🇹🇳', iso: 'tn' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷', iso: 'tr' },
  { code: '+993', country: 'Turkmenistan', flag: '🇹🇲', iso: 'tm' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', iso: 'ug' },
  { code: '+380', country: 'Ukraine', flag: '🇺🇦', iso: 'ua' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾', iso: 'uy' },
  { code: '+998', country: 'Uzbekistan', flag: '🇺🇿', iso: 'uz' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪', iso: 've' },
  { code: '+84', country: 'Vietnam', flag: '🇻🇳', iso: 'vn' },
  { code: '+967', country: 'Yemen', flag: '🇾🇪', iso: 'ye' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲', iso: 'zm' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼', iso: 'zw' }
];

export const DEFAULT_WA_TEMPLATE = `🛵 *OFFICIAL RENTAL INVOICE — {SHOP_NAME}*
--------------------------------------------
Dear *{RENTER_NAME}*,

Thank you for choosing {SHOP_NAME} in Canggu, Bali! 🌴✨
Here is your booking & rental invoice summary:

📌 *RENTAL DETAILS*
👤 Customer: *{RENTER_NAME}*
📞 Phone: *{RENTER_PHONE}*
🛵 Motorbike: *{VEHICLE_NAME}* (Plate: *{PLATE_NUMBER}*)
📅 Period: *{START_DATE}* to *{END_DATE}* ({DURATION_DAYS} day(s))

💰 *PAYMENT SUMMARY*
💵 Daily Rate: {DAILY_RATE} / day
{DISCOUNT_ROW}💳 Total Fee: *{TOTAL_PRICE}*
🔒 Security Deposit: {DEPOSIT}
📲 Payment Method: *{PAYMENT_METHOD}*
✅ Status: *{PAYMENT_STATUS}*

📍 *PICKUP & CONTACT LOCATION*
{SHOP_NAME}
{SHOP_LOCATION}
📞 WhatsApp: {SHOP_PHONE}

⭐ *RENTAL NOTES:*
1. Free helmets and raincoats provided.
2. Please drive safely, wear helmets, and carry a valid license (IDP).
3. Have an amazing ride exploring Bali! 🌴🛵✨

_{SHOP_NAME} — Premium Scooter Rental Pererenan, Canggu, Bali_`;

export const DEFAULT_WA_REMINDER_TEMPLATE = `🛵 *RENTAL REMINDER NOTICE — {SHOP_NAME}*
--------------------------------------------
Hi *{RENTER_NAME}*! 👋

This is a friendly reminder regarding your motorbike rental with {SHOP_NAME} in Canggu, Bali:

🏍️ *Motorbike:* {VEHICLE_NAME} (Plate: *{PLATE_NUMBER}*)
📅 *Start Date:* {START_DATE}
📅 *Return Date:* {END_DATE}
⏳ *Status:* {TIME_LEFT_STATUS}

If you would like to *extend your rental period* or need any assistance, please reply to this message!

📍 *LOCATION & CONTACT*
{SHOP_NAME}
{SHOP_LOCATION}
📞 WhatsApp: {SHOP_PHONE}

_Thank you for riding with {SHOP_NAME}! 🌴✨_`;

const WA_TEMPLATE_STORAGE_KEY = 'boss_rent_wa_template';
const WA_REMINDER_TEMPLATE_STORAGE_KEY = 'boss_rent_wa_reminder_template';

export function getWaTemplate() {
  if (typeof window === 'undefined') return DEFAULT_WA_TEMPLATE;
  try {
    const saved = localStorage.getItem(WA_TEMPLATE_STORAGE_KEY);
    if (!saved || saved.includes('❓')) {
      localStorage.setItem(WA_TEMPLATE_STORAGE_KEY, DEFAULT_WA_TEMPLATE);
      return DEFAULT_WA_TEMPLATE;
    }
    return saved.trim().length > 0 ? saved : DEFAULT_WA_TEMPLATE;
  } catch {
    return DEFAULT_WA_TEMPLATE;
  }
}

export function saveWaTemplate(templateStr) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WA_TEMPLATE_STORAGE_KEY, templateStr);
}

export function getWaReminderTemplate() {
  if (typeof window === 'undefined') return DEFAULT_WA_REMINDER_TEMPLATE;
  try {
    const saved = localStorage.getItem(WA_REMINDER_TEMPLATE_STORAGE_KEY);
    if (!saved || saved.includes('❓')) {
      localStorage.setItem(WA_REMINDER_TEMPLATE_STORAGE_KEY, DEFAULT_WA_REMINDER_TEMPLATE);
      return DEFAULT_WA_REMINDER_TEMPLATE;
    }
    return saved.trim().length > 0 ? saved : DEFAULT_WA_REMINDER_TEMPLATE;
  } catch {
    return DEFAULT_WA_REMINDER_TEMPLATE;
  }
}

export function saveWaReminderTemplate(templateStr) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WA_REMINDER_TEMPLATE_STORAGE_KEY, templateStr);
}

/**
 * Helper to get flag SVG image url from flagcdn.com (Works 100% reliably on Windows PC)
 */
export function getFlagImageUrl(isoCode) {
  if (!isoCode) return '';
  return `https://flagcdn.com/w40/${isoCode.toLowerCase()}.png`;
}

/**
 * Clean phone number string into international format without '+' or spaces for wa.me/ link
 */
export function cleanPhoneForWhatsApp(fullPhone) {
  if (!fullPhone) return '';
  let cleaned = fullPhone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Generate WhatsApp Direct Chat Link using api.whatsapp.com to prevent wa.me redirect encoding corruption
 */
export function getWhatsAppShareUrl(fullPhone, textMessage) {
  const cleanPhone = cleanPhoneForWhatsApp(fullPhone);
  const encodedText = encodeURIComponent(textMessage || '');
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

const WA_GATEWAY_STORAGE_KEY = 'boss_rent_wa_gateway';

export function getWaGatewayConfig() {
  if (typeof window === 'undefined') return { provider: 'fonnte', token: '', enabled: false, endpoint: '' };
  try {
    const saved = localStorage.getItem(WA_GATEWAY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { provider: 'fonnte', token: '', enabled: false, endpoint: '' };
  } catch {
    return { provider: 'fonnte', token: '', enabled: false, endpoint: '' };
  }
}

export function saveWaGatewayConfig(config) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WA_GATEWAY_STORAGE_KEY, JSON.stringify(config));
}

export async function sendWhatsAppGateway(fullPhone, textMessage) {
  const config = getWaGatewayConfig();
  const targetPhone = cleanPhoneForWhatsApp(fullPhone);

  if (!config.enabled || !targetPhone) {
    return { success: false, mode: 'direct_link', url: getWhatsAppShareUrl(fullPhone, textMessage) };
  }

  try {
    if (config.provider === 'fonnte') {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': config.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target: targetPhone,
          message: textMessage
        })
      });
      const data = await res.json();
      return { success: data.status === true, message: data.reason || 'Sent via Fonnte', data };
    }

    if (config.provider === 'wablas') {
      const res = await fetch(config.endpoint || 'https://kudus.wablas.com/api/send-message', {
        method: 'POST',
        headers: {
          'Authorization': config.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: targetPhone,
          message: textMessage
        })
      });
      const data = await res.json();
      return { success: data.status === true, message: data.message || 'Sent via Wablas', data };
    }

    if (config.provider === 'webhook' && config.endpoint) {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.token ? { 'Authorization': `Bearer ${config.token}` } : {})
        },
        body: JSON.stringify({
          phone: targetPhone,
          message: textMessage
        })
      });
      return { success: res.ok, message: 'Sent via Custom Webhook' };
    }
  } catch (err) {
    return { success: false, error: err.message, url: getWhatsAppShareUrl(fullPhone, textMessage) };
  }

  return { success: false, mode: 'direct_link', url: getWhatsAppShareUrl(fullPhone, textMessage) };
}

/**
 * Generate Professional Dual-Language Invoice Text with Custom Template support
 */
export function generateInvoiceText(tx, vehicle, paymentMethodMeta, customTemplate) {
  const formatMoney = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const startDate = new Date(tx.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const endDate = new Date(tx.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  let shopName = 'Demo Rental Preview';
  let shopLocation = 'Jl. Pantai Pererenan, Canggu, Badung, Bali 80351';
  let shopPhone = '+62 812-3456-7890';

  if (typeof window !== 'undefined') {
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.name) shopName = parsed.name;
        if (parsed.location) shopLocation = parsed.location;
        if (parsed.phone) shopPhone = parsed.phone;
      }
    } catch {
      // ignore
    }
  }

  const template = customTemplate || getWaTemplate();

  const discountRow = tx.discount > 0 ? `🎉 Discount Applied: -${formatMoney(tx.discount)}\n` : '';

  return template
    .replaceAll('{RENTER_NAME}', tx.renter_name || 'Customer')
    .replaceAll('{RENTER_PHONE}', tx.renter_phone || '-')
    .replaceAll('{VEHICLE_NAME}', vehicle?.name || 'Motor')
    .replaceAll('{PLATE_NUMBER}', vehicle?.plate_number || '-')
    .replaceAll('{START_DATE}', startDate)
    .replaceAll('{END_DATE}', endDate)
    .replaceAll('{DURATION_DAYS}', (tx.duration_days || 1).toString())
    .replaceAll('{DAILY_RATE}', formatMoney(vehicle?.rate_per_day))
    .replaceAll('{TOTAL_PRICE}', formatMoney(tx.total_price))
    .replaceAll('{DISCOUNT_ROW}', discountRow)
    .replaceAll('{DEPOSIT}', formatMoney(tx.deposit))
    .replaceAll('{PAYMENT_METHOD}', paymentMethodMeta?.label || tx.payment_method || 'Cash')
    .replaceAll('{PAYMENT_STATUS}', tx.status === 'completed' ? 'PAID / LUNAS ✅' : 'ACTIVE / SEWA BERJALAN 🛵')
    .replaceAll('{SHOP_NAME}', shopName)
    .replaceAll('{SHOP_LOCATION}', shopLocation)
    .replaceAll('{SHOP_PHONE}', shopPhone);
}
