/**
 * Helper modul data Customer / Client Demo Rental Preview
 * Mendukung Dual-Mode: Supabase `customers` table + Fallback Automatic Aggregation dari `transactions` & localStorage.
 */

const LOCAL_CUSTOMERS_KEY = 'boss_rent_customers_master';

/**
 * Normalisasi nomor HP untuk keperluan pencocokan unik (hapus spasi, strip, dll)
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '').trim();
}

/**
 * Normalisasi nama (lowercase, trim)
 */
export function normalizeName(name) {
  if (!name) return '';
  return name.trim().toLowerCase();
}

/**
 * Ambil daftar customer beserta agregasi statistik transaksi
 */
export async function fetchCustomers(supabase) {
  try {
    let customerDbList = [];
    let isTableAvailable = false;

    // 1. Cek & Ambil dari tabel Supabase `customers` jika ada
    if (supabase) {
      const { data: dbData, error: dbErr } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!dbErr && Array.isArray(dbData)) {
        isTableAvailable = true;
        customerDbList = dbData;
      }
    }

    // 2. Ambil seluruh transaksi untuk menghitung statistik (total_rentals, total_spent, last_rental_date)
    let transactionsList = [];
    if (supabase) {
      const { data: txData, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .order('start_date', { ascending: false });

      if (!txErr && Array.isArray(txData)) {
        transactionsList = txData;
      }
    }

    // 3. Ambil data dari LocalStorage jika ada (sebagai cadangan offline/fallback)
    let localCustom = [];
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_CUSTOMERS_KEY) : null;
      if (saved) localCustom = JSON.parse(saved);
    } catch { /* ignore */ }

    // Map statistik transaksi berdasarkan Phone / Name
    const statsMap = new Map();

    transactionsList.forEach((tx) => {
      const pNorm = normalizePhone(tx.renter_phone) || normalizeName(tx.renter_name);
      if (!pNorm) return;

      if (!statsMap.has(pNorm)) {
        statsMap.set(pNorm, {
          total_rentals: 0,
          total_spent: 0,
          last_rental_date: tx.start_date || tx.created_at,
          latest_id_number: tx.renter_id_number || '',
          latest_address: tx.renter_address || '',
          latest_image: tx.customer_image_url || '',
          sample_tx: tx,
        });
      }

      const current = statsMap.get(pNorm);
      current.total_rentals += 1;
      if (tx.status !== 'cancelled') {
        current.total_spent += Number(tx.total_price || 0);
      }

      // Update date if tx is newer
      if (tx.start_date && new Date(tx.start_date) > new Date(current.last_rental_date)) {
        current.last_rental_date = tx.start_date;
      }
      if (tx.renter_id_number && !current.latest_id_number) {
        current.latest_id_number = tx.renter_id_number;
      }
      if (tx.renter_address && !current.latest_address) {
        current.latest_address = tx.renter_address;
      }
      if (tx.customer_image_url && !current.latest_image) {
        current.latest_image = tx.customer_image_url;
      }
    });

    // Jika tabel DB `customers` tersedia
    if (isTableAvailable && customerDbList.length > 0) {
      const merged = customerDbList.map((c) => {
        const pKey = normalizePhone(c.phone) || normalizeName(c.name);
        const st = statsMap.get(pKey) || { total_rentals: 0, total_spent: 0, last_rental_date: c.created_at };
        return {
          ...c,
          total_rentals: st.total_rentals,
          total_spent: st.total_spent,
          last_rental_date: st.last_rental_date,
          id_number: c.id_number || st.latest_id_number || '',
          address: c.address || st.latest_address || '',
          customer_image_url: c.customer_image_url || st.latest_image || '',
        };
      });

      // Tambahkan customer dari transaksi yang belum masuk di tabel customers DB
      statsMap.forEach((st, pKey) => {
        const existsInDb = merged.some((c) => (normalizePhone(c.phone) || normalizeName(c.name)) === pKey);
        if (!existsInDb && st.sample_tx) {
          merged.push({
            id: `tx-cust-${st.sample_tx.id}`,
            name: st.sample_tx.renter_name,
            phone: st.sample_tx.renter_phone,
            id_number: st.latest_id_number,
            address: st.latest_address,
            customer_image_url: st.latest_image,
            notes: '',
            created_at: st.sample_tx.created_at || new Date().toISOString(),
            total_rentals: st.total_rentals,
            total_spent: st.total_spent,
            last_rental_date: st.last_rental_date,
            is_implicit: true,
          });
        }
      });

      return merged;
    }

    // Jika tabel DB belum dibuat, gabungkan dari transaksi + localCustom
    const fallbackList = [];
    const processedKeys = new Set();

    // 1. Masukkan localCustom
    localCustom.forEach((c) => {
      const pKey = normalizePhone(c.phone) || normalizeName(c.name);
      processedKeys.add(pKey);
      const st = statsMap.get(pKey) || { total_rentals: 0, total_spent: 0, last_rental_date: c.created_at };
      fallbackList.push({
        ...c,
        total_rentals: st.total_rentals,
        total_spent: st.total_spent,
        last_rental_date: st.last_rental_date,
      });
    });

    // 2. Masukkan customer dari transaksi
    statsMap.forEach((st, pKey) => {
      if (!processedKeys.has(pKey) && st.sample_tx) {
        fallbackList.push({
          id: `tx-cust-${st.sample_tx.id}`,
          name: st.sample_tx.renter_name,
          phone: st.sample_tx.renter_phone,
          id_number: st.latest_id_number,
          address: st.latest_address,
          customer_image_url: st.latest_image,
          notes: '',
          created_at: st.sample_tx.created_at || new Date().toISOString(),
          total_rentals: st.total_rentals,
          total_spent: st.total_spent,
          last_rental_date: st.last_rental_date,
        });
      }
    });

    return fallbackList;
  } catch (err) {
    console.error('Error in fetchCustomers:', err);
    return [];
  }
}

/**
 * Upsert Data Customer (Tambah atau Update)
 */
export async function upsertCustomer(supabase, customerData) {
  if (!customerData.name || !customerData.phone) return { error: 'Nama dan Nomor Telepon wajib diisi' };

  const payload = {
    name: customerData.name.trim(),
    phone: customerData.phone.trim(),
    id_number: customerData.id_number ? customerData.id_number.trim() : null,
    address: customerData.address ? customerData.address.trim() : null,
    notes: customerData.notes ? customerData.notes.trim() : null,
    customer_image_url: customerData.customer_image_url || null,
    updated_at: new Date().toISOString(),
  };

  // Check Supabase DB
  let dbSuccess = false;
  if (supabase) {
    try {
      if (customerData.id && !customerData.id.startsWith('tx-cust-')) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', customerData.id);
        if (!error) dbSuccess = true;
      } else {
        // Cek jika nomor telp sudah ada di DB
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', payload.phone)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('customers')
            .update(payload)
            .eq('id', existing.id);
          if (!error) dbSuccess = true;
        } else {
          const { error } = await supabase
            .from('customers')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (!error) dbSuccess = true;
        }
      }
    } catch { /* ignore if table missing */ }
  }

  // Backup Simpan ke LocalStorage
  try {
    const saved = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    let list = saved ? JSON.parse(saved) : [];
    const pKey = normalizePhone(payload.phone);

    const idx = list.findIndex((c) => normalizePhone(c.phone) === pKey || c.id === customerData.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
    } else {
      list.push({
        id: customerData.id || `cust-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      });
    }
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(list));
  } catch { /* ignore */ }

  return { success: true, dbSuccess };
}

/**
 * Hapus customer dari tabel `customers`. Cuma bisa buat customer yang
 * beneran ada row-nya di DB (id asli), bukan yang "tx-cust-*" (hasil
 * agregasi otomatis dari histori transaksi lama yang belum tersimpan ke
 * Master Customer) — yang itu nggak ada row aslinya buat dihapus.
 */
export async function deleteCustomer(supabase, customerId) {
  if (!supabase || !customerId) return { success: false, error: 'ID customer tidak valid.' };
  if (customerId.startsWith('tx-cust-')) {
    return { success: false, error: 'Customer ini belum tersimpan permanen di Master Customer (masih agregasi otomatis dari histori transaksi lama), jadi belum bisa dihapus dari sini.' };
  }
  try {
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server.' };
  }
}

/**
 * Sinkronkan seluruh data customer dari transaksi lama ke tabel `customers` DB
 */
export async function syncTransactionsToCustomers(supabase) {
  if (!supabase) return { count: 0 };
  let count = 0;

  try {
    const { data: txList } = await supabase.from('transactions').select('*');
    if (!txList || txList.length === 0) return { count: 0 };

    const uniqueMap = new Map();
    txList.forEach((tx) => {
      const pKey = normalizePhone(tx.renter_phone);
      if (!pKey) return;
      if (!uniqueMap.has(pKey)) {
        uniqueMap.set(pKey, {
          name: tx.renter_name,
          phone: tx.renter_phone,
          id_number: tx.renter_id_number || null,
          address: tx.renter_address || null,
          customer_image_url: tx.customer_image_url || null,
          notes: 'Auto-synced from historical transactions',
          created_at: tx.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    for (const [, cust] of uniqueMap.entries()) {
      const res = await upsertCustomer(supabase, cust);
      if (res.success) count++;
    }
  } catch (err) {
    console.error('Error syncTransactionsToCustomers:', err);
  }

  return { count };
}
