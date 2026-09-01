/**
 * AI Diagnostic & Predictive Maintenance Engine
 * Demo Rental Preview
 */

export function analyzeVehicleHealth(vehicle, transactions = []) {
  const currentKm = Number(vehicle.current_km) || 15000;
  const lastServiceKm = Number(vehicle.last_service_km) || 0;
  const lastServicedAt = vehicle.last_serviced_at ? new Date(vehicle.last_serviced_at) : null;

  const vehicleTx = transactions.filter(t => t.vehicle_id === vehicle.id);

  // Filter issues: ONLY count issues reported AFTER last_serviced_at (unresolved issues)
  const unresolvedIssuesTx = vehicleTx.filter(t => {
    if (!t.issues_reported || !t.issues_reported.trim()) return false;
    if (!lastServicedAt) return true; // if never serviced, all issues count
    const txDate = new Date(t.updated_at || t.created_at);
    return txDate > lastServicedAt; // only issues reported AFTER last service
  });

  const recentIssues = unresolvedIssuesTx.map(t => t.issues_reported);

  // Calculate total rental KM from completed transactions
  const totalRentalKm = vehicleTx.reduce((sum, t) => {
    const kmStart = Number(t.km_start) || 0;
    const kmEnd = Number(t.km_end) || 0;
    return sum + (kmEnd > kmStart ? kmEnd - kmStart : 0);
  }, 0);

  // Service intervals (standard scooter maintenance in Indonesia)
  const oilInterval = 2000; // Oli mesin per 2.000 KM
  const cvtInterval = 6000; // Servis CVT & Roller per 6.000 KM

  // Calculate KM driven since last service
  const kmDrivenSinceService = lastServiceKm > 0 ? Math.max(0, currentKm - lastServiceKm) : (currentKm % oilInterval);
  const kmToNextOil = Math.max(0, oilInterval - (kmDrivenSinceService % oilInterval));
  const kmToNextCvt = Math.max(0, cvtInterval - (kmDrivenSinceService % cvtInterval));

  let healthScore = 100;
  const warnings = [];
  const recommendations = [];
  const aiActionItems = [];

  const allIssuesText = recentIssues.join(' ').toLowerCase();

  // 1. Bodi & Estetika (Lecet, Baret, Gores, Spion, Penyok)
  if (allIssuesText.includes('lecet') || allIssuesText.includes('baret') || allIssuesText.includes('gores') || allIssuesText.includes('body') || allIssuesText.includes('bodi') || allIssuesText.includes('penyok') || allIssuesText.includes('jatuh') || allIssuesText.includes('spion')) {
    healthScore -= 15;
    warnings.push('⚠️ Terdeteksi keluhan fisik / bodi motor lecet & aksesoris.');
    recommendations.push('Periksa bodi kendaraan, cat/stiker, serta kelengkapan spion & fisikal motor.');

    aiActionItems.push({
      id: 'perbaikan_bodi_lecet',
      label: 'Perbaikan Bodi Lecet / Cat Goresan & Aksesoris',
      category: 'Bodi & Estetika',
      estimatedCost: 150000,
      reason: 'AI mendeteksi keluhan bodi lecet/baret/spion dari penyewa',
      severity: 'medium',
      recommended: true
    });
  }

  // 2. Sistem Pengereman
  if (allIssuesText.includes('rem') || allIssuesText.includes('blong') || allIssuesText.includes('bunyi')) {
    healthScore -= 25;
    warnings.push('⚠️ Terdeteksi keluhan pada sistem pengereman.');
    recommendations.push('Periksa ketebalan kampas rem depan/belakang & minyak rem.');

    aiActionItems.push({
      id: 'kampas_rem_depan_belakang',
      label: 'Ganti Kampas Rem Depan/Belakang & Minyak Rem',
      category: 'Sistem Pengereman',
      estimatedCost: 85000,
      reason: 'AI mendeteksi rem bunyi / kurang pakem / blong',
      severity: 'high',
      recommended: true
    });
  }

  // 3. Performa Mesin & Injeksi
  if (allIssuesText.includes('mesin') || allIssuesText.includes('kasar') || allIssuesText.includes('panas') || allIssuesText.includes('mogok')) {
    healthScore -= 30;
    warnings.push('🚨 Terdeteksi keluhan pada performa mesin.');
    recommendations.push('Segera ganti oli mesin, cek busi, dan periksa pasokan bahan bakar.');

    aiActionItems.push({
      id: 'tuneup_mesin_injeksi',
      label: 'Tune-Up Mesin, Clean Throttle Body Injeksi & Busi',
      category: 'Performa Mesin',
      estimatedCost: 125000,
      reason: 'AI mendeteksi mesin kasar / panas / mogok',
      severity: 'urgent',
      recommended: true
    });
  }

  // 4. Transmisi CVT & Gredek
  if (allIssuesText.includes('cvt') || allIssuesText.includes('gredek') || allIssuesText.includes('tarikan') || allIssuesText.includes('vbelt')) {
    healthScore -= 20;
    warnings.push('⚠️ Terdeteksi getaran (gredek) pada transmisi CVT.');
    recommendations.push('Bersihkan mangkok CVT, periksa roller & v-belt.');

    aiActionItems.push({
      id: 'servis_cvt_roller',
      label: 'Servis Pembersihan CVT, Greasing Roller & V-Belt',
      category: 'Transmisi CVT',
      estimatedCost: 80000,
      reason: 'AI mendeteksi getaran gredek / tarikan berat pada CVT',
      severity: 'medium',
      recommended: true
    });
  }

  // 5. Kaki-Kaki & Ban
  if (allIssuesText.includes('ban') || allIssuesText.includes('bocor') || allIssuesText.includes('goyang') || allIssuesText.includes('kempes')) {
    healthScore -= 15;
    warnings.push('⚠️ Keluhan kestabilan / kondisi ban.');
    recommendations.push('Cek tekanan angin ban & ketebalan alur ban.');

    aiActionItems.push({
      id: 'ganti_ban_tubeless',
      label: 'Ganti Ban Tubeless Baru & Cek Pentil Angin',
      category: 'Kaki-Kaki & Ban',
      estimatedCost: 220000,
      reason: 'AI mendeteksi ban bocor / kempes / goyang',
      severity: 'medium',
      recommended: true
    });
  }

  // 6. Kelistrikan & Lampu
  if (allIssuesText.includes('lampu') || allIssuesText.includes('sein') || allIssuesText.includes('klakson') || allIssuesText.includes('aki') || allIssuesText.includes('starter') || allIssuesText.includes('mati')) {
    healthScore -= 15;
    warnings.push('⚠️ Terdeteksi keluhan sistem kelistrikan / lampu.');
    recommendations.push('Periksa tegangan aki, saklar, dan bohlam lampu.');

    aiActionItems.push({
      id: 'servis_kelistrikan_lampu',
      label: 'Ganti Bohlam Lampu / Charge Aki & Cek Saklar',
      category: 'Kelistrikan & Lampu',
      estimatedCost: 75000,
      reason: 'AI mendeteksi lampu mati / aki tekor / kelistrikan',
      severity: 'medium',
      recommended: true
    });
  }

  // 7. Kemudi & Suspensi
  if (allIssuesText.includes('shock') || allIssuesText.includes('skok') || allIssuesText.includes('stang') || allIssuesText.includes('miring') || allIssuesText.includes('komstir')) {
    healthScore -= 20;
    warnings.push('⚠️ Terdeteksi keluhan pada kemudi / suspensi (shockbreaker).');
    recommendations.push('Cek kelurusan segitiga stang, seal shockbreaker & komstir.');

    aiActionItems.push({
      id: 'pres_stang_shockbreaker',
      label: 'Pemeriksaan Komstir & Seal Shockbreaker',
      category: 'Suspensi & Kemudi',
      estimatedCost: 135000,
      reason: 'AI mendeteksi stang miring / shockbreaker bocor',
      severity: 'high',
      recommended: true
    });
  }

  // CATCH-ALL GUARANTEE: Jika ada keluhan yang belum ada kategori khusus
  if (recentIssues.length > 0) {
    if (warnings.length === 0) {
      healthScore -= 15;
      const issueText = recentIssues[0];
      warnings.push(`⚠️ Terdeteksi keluhan terlaporkan: "${issueText}".`);
      recommendations.push('Lakukan inspeksi fisik & tes jalan untuk memeriksa kendala.');

      aiActionItems.push({
        id: 'pemeriksaan_umum_bengkel',
        label: `Inspeksi & Perbaikan Khusus (${issueText})`,
        category: 'Perbaikan Umum',
        estimatedCost: 100000,
        reason: `AI mendeteksi keluhan spesifik: "${issueText}"`,
        severity: 'medium',
        recommended: true
      });
    }
    // Batas maksimal kesehatan motor yang memiliki kendala aktif adalah MAKSIMAL 85%
    healthScore = Math.min(healthScore, 85);
  }

  // Mileage-based health deductions (Jadwal KM)
  if (kmToNextOil <= 300) {
    healthScore -= 15;
    warnings.push(`🛢️ Mendekati jadwal ganti oli mesin (tersisa ~${kmToNextOil} KM).`);
    recommendations.push('Jadwalkan penggantian oli mesin (MPX/Yamalube).');

    aiActionItems.push({
      id: 'ganti_oli_mesin_rutin',
      label: 'Ganti Oli Mesin Berkala (MPX2 / Yamalube)',
      category: 'Perawatan Rutin (KM)',
      estimatedCost: 65000,
      reason: `Sisa oli tinggal ~${kmToNextOil} KM`,
      severity: kmToNextOil <= 100 ? 'high' : 'low',
      recommended: true
    });
  }

  if (kmToNextCvt <= 500) {
    healthScore -= 10;
    warnings.push(`⚙️ Mendekati jadwal servis CVT berkala (tersisa ~${kmToNextCvt} KM).`);
    recommendations.push('Jadwalkan pembersihan & pemeriksaan CVT.');

    aiActionItems.push({
      id: 'ganti_oli_gardan_rutin',
      label: 'Ganti Oli Gardan & Pembersihan CVT',
      category: 'Perawatan Rutin (KM)',
      estimatedCost: 50000,
      reason: `Jadwal servis CVT (sisa ~${kmToNextCvt} KM)`,
      severity: 'low',
      recommended: true
    });
  }

  // Status maintenance check
  if (vehicle.status === 'maintenance') {
    healthScore = Math.min(healthScore, 45);
    warnings.push('🔧 Motor sedang dalam status perawatan di bengkel.');
  }

  // Bound score 10 - 100
  healthScore = Math.max(10, Math.min(100, healthScore));

  let statusLevel = 'Sehat';
  let badgeColor = 'var(--accent-green)';
  if (healthScore < 60) {
    statusLevel = 'Perlu Servis Urgent';
    badgeColor = 'var(--accent-red)';
  } else if (healthScore < 85) {
    statusLevel = 'Perlu Cek Berkala';
    badgeColor = 'var(--accent-amber)';
  }

  // Default Fallback items jika motor sehat 100% dan tidak ada keluhan
  if (aiActionItems.length === 0) {
    aiActionItems.push(
      { id: 'oli_mesin_std', label: 'Ganti Oli Mesin (MPX2 / Yamalube)', category: 'Perawatan Rutin (KM)', estimatedCost: 65000, reason: 'Perawatan berkala standar', recommended: false },
      { id: 'oli_gardan_std', label: 'Ganti Oli Gardan / Transmission Oil', category: 'Perawatan Rutin (KM)', estimatedCost: 25000, reason: 'Perawatan berkala standar', recommended: false },
      { id: 'servis_cvt_std', label: 'Pembersihan & Greasing CVT', category: 'Transmisi CVT', estimatedCost: 80000, reason: 'Perawatan berkala standar', recommended: false },
      { id: 'poles_bodi_std', label: 'Perbaikan Bodi Lecet / Poles Bodi', category: 'Bodi & Estetika', estimatedCost: 150000, reason: 'Opsional kosmetik bodi', recommended: false }
    );
  }

  return {
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    plateNumber: vehicle.plate_number,
    currentKm,
    totalRentalKm,
    lastServiceKm,
    lastServicedAt,
    healthScore,
    statusLevel,
    badgeColor,
    warnings,
    recommendations: recommendations.length > 0 ? recommendations : ['Motor dalam kondisi prima 100%. Servis & perbaikan telah diselesaikan.'],
    kmToNextOil,
    kmToNextCvt,
    recentIssues,
    aiActionItems
  };
}
