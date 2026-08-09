'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchCustomers, upsertCustomer, syncTransactionsToCustomers } from '@/lib/customers';
import { exportCustomersToExcel, formatRupiah } from '@/lib/excel';
import { COUNTRY_CODES, getFlagImageUrl } from '@/lib/countryCodes';
import { compressImage } from '@/lib/imageCompressor';

// Country Code Picker Helper for Customer Modal
function CountryCodePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const currentCountry = COUNTRY_CODES.find(c => c.code === value) || COUNTRY_CODES[0];
  const filtered = COUNTRY_CODES.filter(c =>
    c.country.toLowerCase().includes(search.toLowerCase()) ||
    c.code.includes(search)
  );

  return (
    <div style={{ position: 'relative', width: '150px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          padding: '8px 12px',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src={getFlagImageUrl(currentCountry.iso)}
            alt={currentCountry.country}
            style={{ width: '18px', height: '12px', borderRadius: '2px', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span style={{ fontSize: '13px' }}>{currentCountry.code}</span>
        </div>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: 'var(--text-muted)' }}></i>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          width: '260px',
          maxHeight: '260px',
          background: '#0F172A',
          border: '1px solid var(--brand-primary)',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--bg-border)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Cari negara / kode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{ fontSize: '12px', padding: '6px 10px' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Tidak ditemukan
              </div>
            ) : (
              filtered.map(c => {
                const isSelected = c.code === value;
                return (
                  <div
                    key={`${c.iso}-${c.code}`}
                    onClick={() => {
                      onChange(c.code);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(20, 116, 107, 0.15)' : 'transparent',
                      color: isSelected ? 'var(--brand-primary-light)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    <img
                      src={getFlagImageUrl(c.iso)}
                      alt={c.country}
                      style={{ width: '18px', height: '12px', borderRadius: '2px', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <strong style={{ minWidth: '40px' }}>{c.code}</strong>
                    <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.country}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, repeat, new
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    id_number: '',
    address: '',
    notes: '',
    customer_image_url: '',
  });
  const [countryCode, setCountryCode] = useState('+62');
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  const supabase = createClient();

  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers(supabase);
      setCustomers(data);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(loadCustomerData);
  }, [loadCustomerData]);

  const showNotification = (msg, type = 'success') => {
    setFeedbackMsg({ text: msg, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSyncTransactions = async () => {
    setSyncing(true);
    try {
      const { count } = await syncTransactionsToCustomers(supabase);
      showNotification(`Berhasil menyinkronkan data histori! ${count} data tersimpan di Master Customer.`);
      await loadCustomerData();
    } catch {
      showNotification('Gagal menyinkronkan data customer.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setForm({
      name: '',
      phone: '',
      id_number: '',
      address: '',
      notes: '',
      customer_image_url: '',
    });
    setCountryCode('+62');
    setPhoneNumberOnly('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      id_number: customer.id_number || '',
      address: customer.address || '',
      notes: customer.notes || '',
      customer_image_url: customer.customer_image_url || '',
    });

    if (customer.phone) {
      const parts = customer.phone.trim().split(' ');
      if (parts.length > 1 && parts[0].startsWith('+')) {
        setCountryCode(parts[0]);
        setPhoneNumberOnly(parts.slice(1).join(' '));
      } else {
        setCountryCode('+62');
        setPhoneNumberOnly(customer.phone);
      }
    } else {
      setCountryCode('+62');
      setPhoneNumberOnly('');
    }

    setModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.82 });
      setForm(prev => ({ ...prev, customer_image_url: compressed }));
    } catch (err) {
      alert(err.message || 'Gagal memproses foto customer.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Nama customer wajib diisi!');
      return;
    }
    const fullPhone = `${countryCode} ${phoneNumberOnly}`.trim();
    if (!phoneNumberOnly.trim()) {
      alert('Nomor telepon customer wajib diisi!');
      return;
    }

    const payload = {
      ...form,
      phone: fullPhone,
      id: editingCustomer?.id,
    };

    const res = await upsertCustomer(supabase, payload);
    if (res.success) {
      showNotification(editingCustomer ? 'Data customer berhasil diperbarui!' : 'Customer baru berhasil ditambahkan!');
      setModalOpen(false);
      await loadCustomerData();
    } else {
      alert(res.error || 'Gagal menyimpan data customer.');
    }
  };

  const handleExportExcel = () => {
    if (customers.length === 0) {
      alert('Belum ada data customer untuk di-export.');
      return;
    }
    exportCustomersToExcel(customers);
    showNotification('File backup Excel Data Customer berhasil di-download!');
  };

  // Metrics
  const totalCustomersCount = customers.length;
  const repeatCustomersCount = customers.filter(c => (c.total_rentals || 0) > 1).length;
  const totalSpendSum = customers.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
  const nowMonth = new Date().getMonth();
  const nowYear = new Date().getFullYear();
  const newThisMonthCount = customers.filter(c => {
    if (!c.created_at) return false;
    const d = new Date(c.created_at);
    return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
  }).length;

  // Filtered List
  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.id_number && c.id_number.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === 'repeat') return (c.total_rentals || 0) > 1;
    if (activeTab === 'new') return (c.total_rentals || 0) <= 1;
    return true;
  });

  const getWaLink = (phoneStr) => {
    if (!phoneStr) return '#';
    const cleanDigits = phoneStr.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanDigits}`;
  };

  return (
    <div className="dashboard-content" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {feedbackMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 99999,
          background: feedbackMsg.type === 'error' ? '#EF4444' : '#10B981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={`fa-solid fa-${feedbackMsg.type === 'error' ? 'circle-xmark' : 'circle-check'}`}></i>
          {feedbackMsg.text}
        </div>
      )}

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-users" style={{ color: 'var(--brand-primary)' }}></i>
            Database Master Customer
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            Kelola data penyewa, histori transaksi client, dan backup data pelanggan Boss Rent Pererenan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSyncTransactions}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <i className={`fa-solid fa-rotate ${syncing ? 'fa-spin' : ''}`}></i>
            {syncing ? 'Menyinkronkan...' : 'Sync Histori Transaksi'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', background: 'rgba(34, 197, 94, 0.15)', borderColor: '#22C55E', color: '#22C55E' }}
          >
            <i className="fa-solid fa-file-excel"></i>
            Download Backup Excel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAddModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          >
            <i className="fa-solid fa-user-plus"></i>
            Tambah Customer
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Metric 1 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(20, 116, 107, 0.15)', color: 'var(--brand-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>
            <i className="fa-solid fa-address-book"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Customer</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCustomersCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>Orang</span></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Repeat Customer (Loyal)</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#3B82F6' }}>{repeatCustomersCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>Client</span></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>
            <i className="fa-solid fa-vault"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Omset dari Customer</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#22C55E' }}>{formatRupiah(totalSpendSum)}</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Customer Baru Bulan Ini</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#A855F7' }}>{newThisMonthCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>Orang</span></div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--bg-border)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: activeTab === 'all' ? 700 : 500,
              border: activeTab === 'all' ? '1px solid var(--brand-primary)' : '1px solid var(--bg-border)',
              background: activeTab === 'all' ? 'rgba(20, 116, 107, 0.15)' : 'transparent',
              color: activeTab === 'all' ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Semua Customer ({totalCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('repeat')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: activeTab === 'repeat' ? 700 : 500,
              border: activeTab === 'repeat' ? '1px solid #3B82F6' : '1px solid var(--bg-border)',
              background: activeTab === 'repeat' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeTab === 'repeat' ? '#60A5FA' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-crown" style={{ marginRight: '6px' }}></i>
            Repeat Customer ({repeatCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: activeTab === 'new' ? 700 : 500,
              border: activeTab === 'new' ? '1px solid #A855F7' : '1px solid var(--bg-border)',
              background: activeTab === 'new' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: activeTab === 'new' ? '#C084FC' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Customer Baru
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Cari nama, WhatsApp, KTP, alamat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '38px', fontSize: '13px' }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px'
          }}></i>
        </div>
      </div>

      {/* Main Customers List / Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px', color: 'var(--brand-primary)' }}></i>
          <div>Memuat data master customer...</div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          background: 'var(--bg-elevated)',
          borderRadius: '12px',
          border: '1px dashed var(--bg-border)'
        }}>
          <i className="fa-solid fa-users-slash" style={{ fontSize: '40px', color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }}></i>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-primary)' }}>Tidak Ada Customer Ditemukan</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Klik "Sync Histori Transaksi" atau "Tambah Customer" untuk memasukkan data.'}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--bg-border)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--bg-border)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Kontak WhatsApp</th>
                  <th style={{ padding: '14px 16px' }}>No. KTP / Paspor</th>
                  <th style={{ padding: '14px 16px' }}>Alamat</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Total Sewa</th>
                  <th style={{ padding: '14px 16px' }}>Total Spent</th>
                  <th style={{ padding: '14px 16px' }}>Sewa Terakhir</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => {
                  const isRepeat = (customer.total_rentals || 0) > 1;
                  return (
                    <tr key={customer.id} style={{ borderBottom: '1px solid var(--bg-border)', transition: 'background 0.15s ease' }}>
                      {/* Name & Photo */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            onClick={() => customer.customer_image_url && setViewPhotoUrl(customer.customer_image_url)}
                            style={{
                              width: '42px', height: '42px', borderRadius: '50%',
                              background: 'var(--bg-hover)', border: '1.5px solid var(--bg-border)',
                              overflow: 'hidden', flexShrink: 0, cursor: customer.customer_image_url ? 'pointer' : 'default',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {customer.customer_image_url ? (
                              <img src={customer.customer_image_url} alt={customer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <i className="fa-solid fa-user" style={{ fontSize: '18px', color: 'var(--text-muted)' }}></i>
                            )}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {customer.name}
                              {isRepeat && (
                                <span style={{
                                  background: 'var(--status-info-bg)', color: 'var(--status-info)', border: '1px solid var(--status-info)',
                                  fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: 700, whiteSpace: 'nowrap'
                                }}>
                                  <i className="fa-solid fa-crown" style={{ marginRight: '3px' }}></i> Loyal
                                </span>
                              )}
                            </div>
                            {customer.notes && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                {customer.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '14px 16px' }}>
                        <a
                          href={getWaLink(customer.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            color: 'var(--status-success)', fontWeight: 600, textDecoration: 'none',
                            background: 'var(--status-success-bg)', padding: '4px 10px', borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <i className="fa-brands fa-whatsapp" style={{ fontSize: '14px' }}></i>
                          {customer.phone || '-'}
                        </a>
                      </td>

                      {/* ID Number */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {customer.id_number ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{customer.id_number}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>
                        )}
                      </td>

                      {/* Address */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {customer.address || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>-</span>}
                      </td>

                      {/* Total Rentals */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                          background: isRepeat ? 'var(--status-info-bg)' : 'var(--bg-hover)',
                          color: isRepeat ? 'var(--status-info)' : 'var(--text-secondary)',
                          fontWeight: 700, padding: '3px 10px', borderRadius: '12px', fontSize: '12px'
                        }}>
                          {customer.total_rentals || 0}x Sewa
                        </span>
                      </td>

                      {/* Total Spent */}
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--status-success)', whiteSpace: 'nowrap' }}>
                        {formatRupiah(customer.total_spent || 0)}
                      </td>

                      {/* Last Rental */}
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {customer.last_rental_date ? (
                          new Date(customer.last_rental_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOpenEditModal(customer)}
                          style={{ fontSize: '12px', padding: '6px 12px' }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Customer */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">
                  {editingCustomer ? (
                    <><i className="fa-solid fa-user-pen" style={{ marginRight: '6px' }}></i> Edit Data Customer</>
                  ) : (
                    <><i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i> Tambah Customer Baru</>
                  )}
                </div>
                <div className="modal-subtitle">Isi profil & dokumen identitas pelanggan</div>
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '20px' }}>
              {/* Photo Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--bg-elevated)', border: '2px dashed var(--brand-primary)',
                  overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {form.customer_image_url ? (
                    <img src={form.customer_image_url} alt="Foto Customer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fa-solid fa-camera" style={{ fontSize: '22px', color: 'var(--brand-primary)' }}></i>
                  )}
                </div>

                <div>
                  <label className="btn btn-secondary" style={{ fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-upload"></i> Upload Foto / Paspor
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                  {uploadingImg && <span style={{ fontSize: '11px', color: 'var(--brand-primary)', marginLeft: '8px' }}>Memproses foto...</span>}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Foto wajah atau scan dokumen identitas customer.
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  Nama Lengkap Customer <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: John Doe"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              {/* Phone with Country Code */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  No. WhatsApp / Telepon <span className="required">*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CountryCodePicker
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="81234567890"
                    value={phoneNumberOnly}
                    onChange={e => setPhoneNumberOnly(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ID Number */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">No. KTP / Paspor</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="3515XXXXXXXXXXXX atau Paspor No"
                  value={form.id_number}
                  onChange={e => setForm(prev => ({ ...prev, id_number: e.target.value }))}
                />
              </div>

              {/* Address */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Alamat / Penginapan di Bali</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Alamat domisili atau nama villa/hotel di Pererenan/Canggu..."
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                />
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Catatan Khusus (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Helm XL, Pelanggan VVIP, dsb."
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                  Simpan Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Photo Preview */}
      {viewPhotoUrl && (
        <div className="modal-overlay" onClick={() => setViewPhotoUrl(null)}>
          <div style={{ position: 'relative', maxWidth: '80vw', maxHeight: '85vh' }}>
            <img
              src={viewPhotoUrl}
              alt="Preview Customer"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
            />
            <button
              onClick={() => setViewPhotoUrl(null)}
              style={{
                position: 'absolute', top: '-12px', right: '-12px',
                background: '#EF4444', color: '#fff', border: 'none',
                borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
