'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPaymentMethods, savePaymentMethods, DEFAULT_PAYMENT_METHODS } from '@/lib/paymentMethods';
import {
  getWaTemplate,
  saveWaTemplate,
  DEFAULT_WA_TEMPLATE,
  getWaReminderTemplate,
  saveWaReminderTemplate,
  DEFAULT_WA_REMINDER_TEMPLATE,
  getWaGatewayConfig,
  saveWaGatewayConfig,
  sendWhatsAppGateway
} from '@/lib/countryCodes';
import { updateFavicon } from '@/lib/favicon';

const VALID_SETTINGS_TABS = ['storage', 'payment', 'wacustom', 'security', 'business', 'staff', 'delivery'];

// Reads ?tab= so the sidebar "Pengaturan" dropdown links land on the right
// section. Split out because useSearchParams() requires a Suspense boundary.
function TabFromQuery({ onTab }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_SETTINGS_TABS.includes(tab)) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

const FA_ICON_OPTIONS = [
  { icon: 'fa-solid fa-money-bill-wave', label: 'Uang Tunai' },
  { icon: 'fa-solid fa-building-columns', label: 'Bank / Transfer' },
  { icon: 'fa-solid fa-qrcode', label: 'QRIS / Barcode' },
  { icon: 'fa-solid fa-credit-card', label: 'Kartu Kredit / Debit' },
  { icon: 'fa-solid fa-globe', label: 'Wise / International' },
  { icon: 'fa-solid fa-wallet', label: 'E-Wallet' },
  { icon: 'fa-solid fa-receipt', label: 'Faktur / Invoice' },
  { icon: 'fa-solid fa-vault', label: 'Deposit Jaminan' },
];

const COLOR_OPTIONS = [
  { hex: '#22C55E', label: 'Hijau' },
  { hex: '#3B82F6', label: 'Biru' },
  { hex: '#8B5CF6', label: 'Ungu' },
  { hex: '#F59E0B', label: 'Kuning' },
  { hex: '#EF4444', label: 'Merah' },
  { hex: '#06B6D4', label: 'Cyan' },
  { hex: '#EC4899', label: 'Pink' },
];

const DEFAULT_STORAGE_PHOTOS = [
  { id: 'logo-company', title: 'Company Official Logo (logoCompany.png)', url: '/images/logoCompany.png', date: 'System Asset' },
  { id: 'logo-brand', title: 'Brand Logo Badge (logo.png)', url: '/images/logo.png', date: 'System Asset' },
  { id: '1', title: 'Customer Bali Scooter', url: '/images/boss_rent_customer_bali.png', date: 'Bento Asset' },
  { id: '2', title: 'Mint Green Vespa Sprint Fleet', url: '/images/boss_rent_bento_1.png', date: 'Bento Asset' },
  { id: '3', title: 'Fleet Lineup Serviced & Clean', url: '/images/boss_rent_fleet_lineup.png', date: 'Bento Asset' },
  { id: '4', title: 'Pererenan Beach Ride & Sunset', url: '/images/boss_rent_bento_2.png', date: 'Bento Asset' },
  { id: '5', title: 'Key Handover & Villa Delivery', url: '/images/boss_rent_bento_3.png', date: 'Bento Asset' },
  { id: '6', title: 'Canggu Coastal Road Exploring', url: '/images/boss_rent_bento_4.png', date: 'Bento Asset' },
  { id: '7', title: 'Scenic Countryside Rice Paddies', url: '/images/boss_rent_bento_5.png', date: 'Bento Asset' },
  { id: '8', title: 'Sanitized Clean Helmets Service', url: '/images/boss_rent_bento_6.png', date: 'Bento Asset' },
  { id: '9', title: '24/7 Roadside Assistance Bali', url: '/images/boss_rent_bento_7.png', date: 'Bento Asset' },
  { id: '10', title: 'Red Honda Scoopy Sunset Edition', url: '/images/boss_rent_bento_8.png', date: 'Bento Asset' },
  { id: '11', title: 'Yamaha NMAX 155 Maxi Scooter', url: '/images/boss_rent_bento_9.png', date: 'Bento Asset' },
  { id: '12', title: 'Honda PCX 160 Touring Edition', url: '/images/boss_rent_bento_10.png', date: 'Bento Asset' },
  { id: '13', title: 'Yamaha Aerox Cyber City Sport', url: '/images/boss_rent_bento_11.png', date: 'Bento Asset' },
  { id: '14', title: 'Helmet Handover Villa Delivery', url: '/images/boss_rent_helmet_handover.png', date: 'Bento Asset' },
  { id: 'v-vespa', title: 'Vehicle Model: Vespa Sprint 150', url: '/images/vehicle_vespa.png', date: 'Fleet Model Asset' },
  { id: 'v-nmax', title: 'Vehicle Model: Yamaha NMAX 155', url: '/images/vehicle_nmax.png', date: 'Fleet Model Asset' },
  { id: 'v-pcx', title: 'Vehicle Model: Honda PCX 160', url: '/images/vehicle_pcx.png', date: 'Fleet Model Asset' },
  { id: 'v-scoopy', title: 'Vehicle Model: Honda Scoopy 110', url: '/images/vehicle_scoopy.png', date: 'Fleet Model Asset' },
  { id: 'v-vario', title: 'Vehicle Model: Honda Vario 160', url: '/images/vehicle_vario.png', date: 'Fleet Model Asset' },
  { id: 'v-aerox', title: 'Vehicle Model: Yamaha Aerox 155', url: '/images/vehicle_aerox.png', date: 'Fleet Model Asset' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('storage'); // 'storage', 'payment', 'security', 'business', 'wacustom', 'staff'
  const [alert, setAlert] = useState(null);

  // ── Staff accounts (Akun Staff tab) ──
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ email: '', password: '', full_name: '', role: 'driver', phone: '' });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState('');

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const res = await fetch('/api/staff');
      const data = await res.json().catch(() => []);
      if (res.ok) setStaffList(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setStaffLoading(false);
  }, []);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({ email: '', password: '', full_name: '', role: 'driver', phone: '' });
    setStaffError('');
    setStaffModalOpen(true);
  };

  const openEditStaff = (s) => {
    setEditingStaff(s);
    setStaffForm({ email: s.email || '', password: '', full_name: s.full_name || '', role: s.role || 'driver', phone: s.phone || '' });
    setStaffError('');
    setStaffModalOpen(true);
  };

  const handleStaffSave = async (e) => {
    e.preventDefault();
    if (!staffForm.full_name.trim()) { setStaffError('Nama wajib diisi.'); return; }
    if (!editingStaff && (!staffForm.email.trim() || !staffForm.password)) {
      setStaffError('Email dan password wajib diisi untuk akun baru.');
      return;
    }
    setStaffSaving(true);
    setStaffError('');
    try {
      const res = await fetch(editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff', {
        method: editingStaff ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStaffError(data.error || 'Gagal menyimpan akun staff.');
        setStaffSaving(false);
        return;
      }
      setStaffModalOpen(false);
      fetchStaff();
    } catch {
      setStaffError('Gagal terhubung ke server.');
    }
    setStaffSaving(false);
  };

  const handleStaffDelete = async (s) => {
    if (!confirm(`Hapus akun staff "${s.full_name}"? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/staff/${s.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStaffList(prev => prev.filter(x => x.id !== s.id));
      } else {
        alert(data.error || 'Gagal menghapus akun staff.');
      }
    } catch {
      alert('Gagal terhubung ke server.');
    }
  };

  // ── Pemasukan khusus per-driver (gaji, bonus, dll) ──
  const [incomeModalStaff, setIncomeModalStaff] = useState(null);
  const [unpaidByStaff, setUnpaidByStaff] = useState({});
  const [payoutModalStaff, setPayoutModalStaff] = useState(null);
  const [payoutEntries, setPayoutEntries] = useState([]);
  const [payoutBusyId, setPayoutBusyId] = useState(null);

  const fetchUnpaidPayouts = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json().catch(() => []);
      if (Array.isArray(data)) {
        const unpaid = data.filter(e => e.type === 'income' && e.staff_id && e.payment_status !== 'paid');
        const totals = {};
        unpaid.forEach(e => {
          totals[e.staff_id] = (totals[e.staff_id] || 0) + Number(e.amount || 0);
        });
        setUnpaidByStaff(totals);
      }
    } catch { /* ignore */ }
  }, []);

  const openPayoutModal = async (staff) => {
    setPayoutModalStaff(staff);
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json().catch(() => []);
      const entries = (Array.isArray(data) ? data : [])
        .filter(e => e.type === 'income' && e.staff_id === staff.id && e.payment_status !== 'paid')
        .sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''));
      setPayoutEntries(entries);
    } catch {
      setPayoutEntries([]);
    }
  };

  const markPayoutPaid = async (entryId) => {
    setPayoutBusyId(entryId);
    try {
      const res = await fetch(`/api/expenses/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid' }),
      });
      if (res.ok) {
        setPayoutEntries(prev => prev.filter(e => e.id !== entryId));
        fetchUnpaidPayouts();
      }
    } catch { /* ignore */ }
    setPayoutBusyId(null);
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      Promise.resolve().then(fetchStaff);
      Promise.resolve().then(fetchUnpaidPayouts);
    }
  }, [activeTab, fetchStaff, fetchUnpaidPayouts]);

  const [incomeForm, setIncomeForm] = useState({ title: '', amount: '', expense_date: '', notes: '' });
  const [incomeSaving, setIncomeSaving] = useState(false);
  const [incomeError, setIncomeError] = useState('');

  const openIncomeModal = (staff) => {
    setIncomeModalStaff(staff);
    setIncomeForm({ title: '', amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '' });
    setIncomeError('');
  };

  const handleIncomeSave = async (e) => {
    e.preventDefault();
    if (!incomeForm.title.trim() || !incomeForm.amount) {
      setIncomeError('Judul dan jumlah wajib diisi.');
      return;
    }
    setIncomeSaving(true);
    setIncomeError('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'income',
          title: incomeForm.title.trim(),
          category: 'staff_income',
          amount: incomeForm.amount,
          expense_date: incomeForm.expense_date,
          notes: incomeForm.notes,
          staff_id: incomeModalStaff.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIncomeError(data.error || 'Gagal menyimpan pemasukan.');
        setIncomeSaving(false);
        return;
      }
      setIncomeModalStaff(null);
      fetchUnpaidPayouts();
    } catch {
      setIncomeError('Gagal terhubung ke server.');
    }
    setIncomeSaving(false);
  };

  // ── Delivery Zones (Zona Delivery tab) ──
  const [zoneList, setZoneList] = useState([]);
  const [zoneLoading, setZoneLoading] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ name: '', zone_label: '', color: '#3B82F6', fee: '' });
  const [zoneSaving, setZoneSaving] = useState(false);
  const [zoneError, setZoneError] = useState('');

  const fetchZones = useCallback(async () => {
    setZoneLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from('delivery_zones').select('*').order('sort_order', { ascending: true });
      setZoneList(data || []);
    } catch { /* ignore */ }
    setZoneLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'delivery') Promise.resolve().then(fetchZones);
  }, [activeTab, fetchZones]);

  const openAddZone = () => {
    setEditingZone(null);
    setZoneForm({ name: '', zone_label: '', color: '#3B82F6', fee: '' });
    setZoneError('');
    setZoneModalOpen(true);
  };

  const openEditZone = (z) => {
    setEditingZone(z);
    setZoneForm({ name: z.name || '', zone_label: z.zone_label || '', color: z.color || '#3B82F6', fee: String(z.fee || '') });
    setZoneError('');
    setZoneModalOpen(true);
  };

  const handleZoneSave = async (e) => {
    e.preventDefault();
    if (!zoneForm.name.trim() || !zoneForm.zone_label.trim()) { setZoneError('Nama area dan label zona wajib diisi.'); return; }
    setZoneSaving(true);
    setZoneError('');
    try {
      const res = await fetch(editingZone ? `/api/delivery-zones/${editingZone.id}` : '/api/delivery-zones', {
        method: editingZone ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setZoneError(data.error || 'Gagal menyimpan zona.');
        setZoneSaving(false);
        return;
      }
      setZoneModalOpen(false);
      fetchZones();
    } catch {
      setZoneError('Gagal terhubung ke server.');
    }
    setZoneSaving(false);
  };

  const handleZoneDelete = async (z) => {
    if (!confirm(`Hapus zona "${z.name}"?`)) return;
    try {
      const res = await fetch(`/api/delivery-zones/${z.id}`, { method: 'DELETE' });
      if (res.ok) setZoneList(prev => prev.filter(x => x.id !== z.id));
    } catch { /* ignore */ }
  };

  // Statistics State
  const [stats, setStats] = useState({ vehicles: 0, transactions: 0, expenses: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Payment Methods State
  const [paymentMethods, setPaymentMethodsState] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editPayment, setEditPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ id: '', label: '', icon: 'fa-solid fa-building-columns', color: '#3B82F6', active: true });

  // Security / Password State
  const [passForm, setPassForm] = useState({ currentPass: '', newPass: '', confirmPass: '' });
  const [showPass, setShowPass] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Operasional & CMS Sub-Tab State ('profile' | 'hero' | 'gallery' | 'faqs')
  const [cmsSubTab, setCmsSubTab] = useState('profile');

  // Business & Public Web CMS Settings State
  const [bizForm, setBizForm] = useState({
    name: 'DEMO RENTAL PREVIEW',
    logoUrl: '/images/logoCompany.png',
    location: 'Jl. Pantai Pererenan No.119, Pererenan, Kec. Mengwi, Kabupaten Badung, Bali 80351',
    phone: '+62 812-3710-9751',
    instagramUrl: 'https://www.instagram.com/bossrentpererenan?igsh=MWFxZzE3eWI2dWlqZA==',
    instagramHandle: '@demorentalpreview',
    tagline: 'Available Scooter For Rent • Best Service • Best Price • Villa Delivery Available • Clean & Well-Maintained Scooters',
    heroTitle: 'Clean & Reliable Scooter Rental in Pererenan & Canggu',
    heroSubtitle: 'Explore Bali with confidence! Clean helmets, delivery & pickup in Canggu / Pererenan area, transparent daily & weekly rates, and 24/7 WhatsApp support.',
    rating: 5.0,
    reviewsCount: 24,
    satisfactionPercent: 100,
    cleanScootersCount: 50,
    defaultDeposit: 500000,
    oilInterval: 2000,
    cvtInterval: 6000,
    galleryPhotos: [
      { url: '/images/boss_rent_customer_bali.png', title: 'Scooter Rental in Pererenan', tag: 'Premium Fleet', icon: 'fa-solid fa-star' },
      { url: '/images/boss_rent_bento_1.png', title: 'Mint Green Vespa Fleet', tag: 'Stylish Scooters', icon: 'fa-solid fa-motorcycle' },
      { url: '/images/boss_rent_fleet_lineup.png', title: 'Clean & Regularly Serviced Fleet', tag: '100% Maintained', icon: 'fa-solid fa-wrench' },
      { url: '/images/boss_rent_bento_2.png', title: 'Pererenan Beach Exploring', tag: 'Canggu Area', icon: 'fa-solid fa-umbrella-beach' },
      { url: '/images/boss_rent_bento_3.png', title: 'Easy Key Handover Service', tag: 'Express Pickup', icon: 'fa-solid fa-key' },
      { url: '/images/boss_rent_bento_6.png', title: 'Sanitized Clean Helmets Service', tag: 'Safety Standard', icon: 'fa-solid fa-shield-halved' }
    ],
    uploadedStoragePhotos: DEFAULT_STORAGE_PHOTOS,
    faqs: [
      {
        q: 'What documents are required to rent a scooter at Demo Rental Preview?',
        a: 'It is very simple! You only need to present a valid ID / Passport and a Driver’s License (or International Driving Permit for overseas tourists). Verification takes only 3 minutes with no complicated original document holding.'
      },
      {
        q: 'Is villa or hotel delivery service available in Pererenan & Canggu?',
        a: 'Yes! We provide convenient scooter delivery & pickup service directly to your Villa, Hotel, or Resort in Pererenan, Canggu, Batu Bolong, Echo Beach, and Umalas areas upon request.'
      },
      {
        q: 'What amenities are included with every scooter rental?',
        a: 'Every scooter rental comes equipped with 2 clean sanitized helmets, 2 premium raincoats, a sturdy handlebar phone holder for GPS navigation, and a well-maintained scooter with fuel ready to ride.'
      },
      {
        q: 'What should I do if I experience a flat tire or mechanical issue during my rental?',
        a: 'Don’t worry! Our 24/7 Roadside Assistance team is always ready to assist you anywhere in Bali to fix the issue or provide a swap scooter promptly.'
      },
      {
        q: 'How does the security deposit refund process work?',
        a: 'The security deposit is refunded in full (Cash or Bank Transfer) immediately upon scooter return following a quick joint physical check.'
      }
    ]
  });

  // Direct File Upload Handler (FileReader -> Base64 Storage)
  const handleFileUploadToStorage = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        const newPhotoItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
          title: file.name.replace(/\.[^/.]+$/, ""),
          url: base64Url,
          date: new Date().toLocaleDateString('id-ID')
        };

        setBizForm(prev => {
          const updated = {
            ...prev,
            uploadedStoragePhotos: [newPhotoItem, ...(prev.uploadedStoragePhotos || [])]
          };
          localStorage.setItem('boss_rent_biz_settings', JSON.stringify(updated));
          return updated;
        });
        showAlert('📁 Foto baru berhasil di-upload dan tersimpan di Repositori Storage (Opsi #5)!');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      const logoTitle = `Logo Brand — ${file.name.replace(/\.[^/.]+$/, "")}`;
      const newStorageItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        title: logoTitle,
        url: base64Url,
        date: new Date().toLocaleDateString('id-ID')
      };

      setBizForm(p => {
        const updated = {
          ...p,
          logoUrl: base64Url,
          uploadedStoragePhotos: [newStorageItem, ...(p.uploadedStoragePhotos || [])]
        };
        localStorage.setItem('boss_rent_biz_settings', JSON.stringify(updated));
        updateFavicon(base64Url);
        return updated;
      });
      showAlert('🖼️ Logo brand baru berhasil di-upload! Tampilan logo & icon browser (favicon) telah di-sinkronkan.');
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadGalleryBackup = () => {
    const backupData = {
      app: 'Demo Rental Preview',
      type: 'Gallery Photos Storage Backup',
      exported_at: new Date().toISOString(),
      total_photos: bizForm.uploadedStoragePhotos?.length || 0,
      photos: bizForm.uploadedStoragePhotos || []
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_boss_rent_gallery_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert('📦 File backup repositori galeri foto berhasil di-download!');
  };

  const handleUseStoragePhotoInGallery = (photo) => {
    setBizForm(prev => {
      const updated = {
        ...prev,
        galleryPhotos: [
          ...(prev.galleryPhotos || []),
          {
            title: photo.title || 'Foto Baru Upload',
            tag: 'Customer Photo',
            url: photo.url,
            icon: 'fa-solid fa-camera'
          }
        ]
      };
      localStorage.setItem('boss_rent_biz_settings', JSON.stringify(updated));
      return updated;
    });
    setCmsSubTab('gallery');
    showAlert('📌 Foto dari Storage Repositori berhasil digunakan pada Landing Page!');
  };

  const handleDeleteStoragePhoto = (photoId) => {
    setBizForm(prev => {
      const updated = {
        ...prev,
        uploadedStoragePhotos: (prev.uploadedStoragePhotos || []).filter(p => p.id !== photoId)
      };
      localStorage.setItem('boss_rent_biz_settings', JSON.stringify(updated));
      return updated;
    });
    showAlert('Foto berhasil dihapus dari Storage Repositori.');
  };

  const handleModalFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewPhotoForm(p => ({
        ...p,
        url: event.target.result,
        title: p.title || file.name.replace(/\.[^/.]+$/, "")
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddFaq = () => {
    setBizForm(prev => ({
      ...prev,
      faqs: [
        ...(prev.faqs || []),
        { q: 'New Question title in English...', a: 'Detailed answer explanation in English...' }
      ]
    }));
  };

  const handleUpdateFaq = (index, field, value) => {
    setBizForm(prev => {
      const newFaqs = [...(prev.faqs || [])];
      newFaqs[index] = { ...newFaqs[index], [field]: value };
      return { ...prev, faqs: newFaqs };
    });
  };

  const handleDeleteFaq = (index) => {
    setBizForm(prev => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index)
    }));
  };

  // Add Photo Modal State
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoForm, setNewPhotoForm] = useState({
    title: '',
    tag: 'Premium Fleet',
    url: '/images/boss_rent_bento_1.png',
    icon: 'fa-solid fa-motorcycle'
  });
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState(null);

  // Preset photos options for quick selection in modal
  const PHOTO_PRESETS = [
    { label: 'Customer Bali Scooter', url: '/images/boss_rent_customer_bali.png' },
    { label: 'Mint Green Vespa Fleet', url: '/images/boss_rent_bento_1.png' },
    { label: 'Fleet Lineup Serviced', url: '/images/boss_rent_fleet_lineup.png' },
    { label: 'Pererenan Beach Exploring', url: '/images/boss_rent_bento_2.png' },
    { label: 'Key Handover Service', url: '/images/boss_rent_bento_3.png' },
    { label: 'Red Honda Scoopy Sunset', url: '/images/boss_rent_bento_8.png' },
    { label: 'Sanitized Clean Helmets', url: '/images/boss_rent_bento_6.png' },
    { label: 'Helmet Handover Villa', url: '/images/boss_rent_helmet_handover.png' },
    { label: 'Scenic Countryside Cruise', url: '/images/boss_rent_bento_5.png' },
  ];

  // Drag & Drop Reorder Handlers
  const handleDragStart = (e, index) => {
    setDraggedPhotoIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedPhotoIdx === null || draggedPhotoIdx === targetIndex) return;

    setBizForm(prev => {
      const photos = [...(prev.galleryPhotos || [])];
      const [draggedItem] = photos.splice(draggedPhotoIdx, 1);
      photos.splice(targetIndex, 0, draggedItem);
      return { ...prev, galleryPhotos: photos };
    });
    setDraggedPhotoIdx(null);
  };

  const handleMovePhotoUp = (index) => {
    if (index === 0) return;
    setBizForm(prev => {
      const photos = [...(prev.galleryPhotos || [])];
      const temp = photos[index - 1];
      photos[index - 1] = photos[index];
      photos[index] = temp;
      return { ...prev, galleryPhotos: photos };
    });
  };

  const handleMovePhotoDown = (index) => {
    setBizForm(prev => {
      const photos = [...(prev.galleryPhotos || [])];
      if (index >= photos.length - 1) return prev;
      const temp = photos[index + 1];
      photos[index + 1] = photos[index];
      photos[index] = temp;
      return { ...prev, galleryPhotos: photos };
    });
  };

  const handleSaveNewPhotoModal = (e) => {
    e.preventDefault();
    if (!newPhotoForm.title || !newPhotoForm.url) return;

    const newStorageItem = {
      // eslint-disable-next-line react-hooks/purity -- ID unik digenerate di event handler (submit), bukan saat render
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      title: newPhotoForm.title,
      url: newPhotoForm.url,
      date: new Date().toLocaleDateString('id-ID')
    };

    setBizForm(prev => {
      const updatedPhotos = [...(prev.galleryPhotos || []), { ...newPhotoForm }];
      const updatedStorage = [newStorageItem, ...(prev.uploadedStoragePhotos || [])];

      const newForm = {
        ...prev,
        galleryPhotos: updatedPhotos,
        uploadedStoragePhotos: updatedStorage
      };

      localStorage.setItem('boss_rent_biz_settings', JSON.stringify(newForm));
      return newForm;
    });

    setShowAddPhotoModal(false);
    setNewPhotoForm({
      title: '',
      tag: 'Premium Fleet',
      url: '/images/boss_rent_bento_1.png',
      icon: 'fa-solid fa-motorcycle'
    });

    showAlert('✨ Foto baru berhasil ditambahkan ke Galeri & otomatis tersimpan ke Storage Repositori Opsi #5!');
  };

  const handleUpdateGalleryPhoto = (index, field, value) => {
    setBizForm(prev => {
      const newPhotos = [...(prev.galleryPhotos || [])];
      newPhotos[index] = { ...newPhotos[index], [field]: value };
      return { ...prev, galleryPhotos: newPhotos };
    });
  };

  const handleDeleteGalleryPhoto = (index) => {
    setBizForm(prev => ({
      ...prev,
      galleryPhotos: (prev.galleryPhotos || []).filter((_, i) => i !== index)
    }));
  };

  // WA Template & Gateway State (Dual Templates: Invoice & Reminder + API Gateway)
  const [waSubTab, setWaSubTab] = useState('invoice'); // 'invoice' | 'reminder' | 'gateway'
  const [waInvoiceText, setWaInvoiceText] = useState('');
  const [waReminderText, setWaReminderText] = useState('');
  const [waSavedAlert, setWaSavedAlert] = useState(null);

  const [waGatewayForm, setWaGatewayForm] = useState({ provider: 'fonnte', token: '', enabled: false, endpoint: '' });
  const [testGatewayPhone, setTestGatewayPhone] = useState('');
  const [testingGateway, setTestingGateway] = useState(false);

  // Backup & Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState(null);
  const [restoringData, setRestoringData] = useState(false);

  useEffect(() => {
    // Defer ke microtask: baca localStorage + setState tidak sinkron di effect
    Promise.resolve().then(() => {
      setWaInvoiceText(getWaTemplate());
      setWaReminderText(getWaReminderTemplate());
      setWaGatewayForm(getWaGatewayConfig());
    });
  }, []);

  const handleSaveWaInvoiceTemplate = (e) => {
    e.preventDefault();
    saveWaTemplate(waInvoiceText);
    showAlert('Format custom WhatsApp Invoice berhasil disimpan!');
    setWaSavedAlert('invoice');
    setTimeout(() => setWaSavedAlert(null), 5000);
  };

  const handleResetWaInvoiceTemplate = () => {
    setWaInvoiceText(DEFAULT_WA_TEMPLATE);
    saveWaTemplate(DEFAULT_WA_TEMPLATE);
    showAlert('Template WhatsApp Invoice dikembalikan ke standar default!');
  };

  const handleSaveWaReminderTemplate = (e) => {
    e.preventDefault();
    saveWaReminderTemplate(waReminderText);
    showAlert('Format custom WhatsApp Reminder (Pengingat) berhasil disimpan!');
    setWaSavedAlert('reminder');
    setTimeout(() => setWaSavedAlert(null), 5000);
  };

  const handleResetWaReminderTemplate = () => {
    setWaReminderText(DEFAULT_WA_REMINDER_TEMPLATE);
    saveWaReminderTemplate(DEFAULT_WA_REMINDER_TEMPLATE);
    showAlert('Template WhatsApp Reminder dikembalikan ke standar default!');
  };

  const handleSaveWaGateway = (e) => {
    e.preventDefault();
    saveWaGatewayConfig(waGatewayForm);
    showAlert('Konfigurasi WhatsApp Gateway API berhasil disimpan!');
  };

  const handleTestWaGateway = async () => {
    if (!testGatewayPhone) {
      showAlert('Masukkan nomor HP penerima pesan tes (misal: 628123456789).', 'danger');
      return;
    }
    setTestingGateway(true);
    const testMsg = `🛵 *DEMO RENTAL PREVIEW — WA GATEWAY TEST*\n\nHello! This is a test message sent from Demo Rental Preview System Gateway API (${waGatewayForm.provider.toUpperCase()}).\n\n✅ Gateway connection is working properly!`;
    const res = await sendWhatsAppGateway(testGatewayPhone, testMsg);
    setTestingGateway(false);

    if (res.success) {
      showAlert(`✓ Tes WA Gateway Berhasil! Pesan terkirim via ${waGatewayForm.provider.toUpperCase()}.`);
    } else if (res.mode === 'direct_link') {
      window.open(res.url, '_blank');
      showAlert('Gateway API tidak aktif / token kosong. Mengalihkan ke WhatsApp Direct Link.');
    } else {
      showAlert(`❌ Gagal mengirim tes WA Gateway: ${res.error || res.message || 'Periksa API Key / Status Gateway.'}`, 'danger');
    }
  };

  const handleInsertInvoiceTag = (tag) => {
    setWaInvoiceText(prev => prev + ` ${tag}`);
  };

  const handleInsertReminderTag = (tag) => {
    setWaReminderText(prev => prev + ` ${tag}`);
  };

  // 📦 1-CLICK FULL BACKUP DOWNLOAD (JSON)
  const handleFullBackupDownload = async () => {
    setBackupLoading(true);
    try {
      const supabase = createClient();
      const [vRes, tRes, eRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('expenses').select('*')
      ]);

      const backupObject = {
        app: 'Demo Rental Preview',
        version: '2.0',
        exported_at: new Date().toISOString(),
        data: {
          vehicles: vRes.data || [],
          transactions: tRes.data || [],
          expenses: eRes.data || [],
          settings: {
            biz: JSON.parse(localStorage.getItem('boss_rent_biz_settings') || '{}'),
            wa_invoice: localStorage.getItem('boss_rent_wa_template') || '',
            wa_reminder: localStorage.getItem('boss_rent_wa_reminder_template') || '',
            wa_gateway: JSON.parse(localStorage.getItem('boss_rent_wa_gateway') || '{}'),
            payment_methods: JSON.parse(localStorage.getItem('boss_rent_payment_methods') || '[]'),
          }
        }
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const jsonStr = JSON.stringify(backupObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `boss_rent_full_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('✓ Full Backup Database (.json) berhasil diunduh!');
    } catch (err) {
      showAlert(`Gagal mengeksport backup data: ${err.message}`, 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  // 📦 1-CLICK FULL RESTORE / IMPORT (JSON)
  const handleSelectRestoreFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.data || (!json.data.vehicles && !json.data.transactions)) {
          showAlert('File JSON cadangan tidak valid atau rusak.', 'danger');
          return;
        }
        // Precompute tanggal tampilan di event handler — Date.now() tidak boleh dipanggil saat render (purity)
        setRestoreModalData({
          ...json,
          _displayDate: new Date(json.exported_at || Date.now()).toLocaleDateString('id-ID'),
        });
      } catch {
        showAlert('Gagal membaca file JSON. Pastikan format file benar.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExecuteRestore = async () => {
    if (!restoreModalData || !restoreModalData.data) return;
    setRestoringData(true);

    try {
      const supabase = createClient();
      const { vehicles, transactions, expenses, settings } = restoreModalData.data;

      // 1. Restore local storage settings
      if (settings) {
        if (settings.biz) localStorage.setItem('boss_rent_biz_settings', JSON.stringify(settings.biz));
        if (settings.wa_invoice) localStorage.setItem('boss_rent_wa_template', settings.wa_invoice);
        if (settings.wa_reminder) localStorage.setItem('boss_rent_wa_reminder_template', settings.wa_reminder);
        if (settings.wa_gateway) localStorage.setItem('boss_rent_wa_gateway', JSON.stringify(settings.wa_gateway));
        if (settings.payment_methods) localStorage.setItem('boss_rent_payment_methods', JSON.stringify(settings.payment_methods));
      }

      // 2. Restore DB Vehicles
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        await supabase.from('vehicles').upsert(vehicles, { onConflict: 'id' });
      }

      // 3. Restore DB Transactions
      if (Array.isArray(transactions) && transactions.length > 0) {
        await supabase.from('transactions').upsert(transactions, { onConflict: 'id' });
      }

      // 4. Restore DB Expenses
      if (Array.isArray(expenses) && expenses.length > 0) {
        await supabase.from('expenses').upsert(expenses, { onConflict: 'id' });
      }

      setRestoreModalData(null);
      fetchStats();
      showAlert('🎉 Data aplikasi & pengaturan berhasil dipulihkan dari file backup!');
    } catch (err) {
      showAlert(`Terjadi kesalahan saat memulihkan data: ${err.message}`, 'danger');
    } finally {
      setRestoringData(false);
    }
  };

  const showAlert = (message, type = 'success', title = '') => {
    setAlert({
      message,
      type,
      title: title || (type === 'danger' ? 'Pemberitahuan System Error' : 'Berhasil Diperbarui ✓')
    });
  };

  // Fetch DB Statistics
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [vRes, tRes, eRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/transactions'),
        fetch('/api/expenses'),
      ]);
      const vData = await vRes.json();
      const tData = await tRes.json();
      const eData = await eRes.json();

      let vCount = Array.isArray(vData) ? vData.length : 0;
      let tCount = Array.isArray(tData) ? tData.length : 0;
      let eCount = Array.isArray(eData) ? eData.length : 0;

      // Fallback: jika API gagal (non-array), ambil langsung dari Supabase
      if (!Array.isArray(vData) || !Array.isArray(tData) || !Array.isArray(eData)) {
        try {
          const supabase = createClient();
          const [vFb, tFb, eFb] = await Promise.all([
            supabase.from('vehicles').select('id'),
            supabase.from('transactions').select('id'),
            supabase.from('expenses').select('id'),
          ]);
          if (!Array.isArray(vData)) vCount = vFb.data?.length || 0;
          if (!Array.isArray(tData)) tCount = tFb.data?.length || 0;
          if (!Array.isArray(eData)) eCount = eFb.data?.length || 0;
        } catch (fbErr) {
          console.warn('Supabase fallback (settings stats) gagal:', fbErr);
        }
      }

      setStats({
        vehicles: vCount,
        transactions: tCount,
        expenses: eCount,
      });
    } catch {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(() => {
      fetchStats();
      setPaymentMethodsState(getPaymentMethods());

      // Load business settings from local storage if available, and merge all default storage photos
      try {
        const savedBiz = localStorage.getItem('boss_rent_biz_settings');
        if (savedBiz) {
          const parsed = JSON.parse(savedBiz);
          const existingUrls = new Set((parsed.uploadedStoragePhotos || []).map(p => p.url));
          const missingDefaults = DEFAULT_STORAGE_PHOTOS.filter(dp => !existingUrls.has(dp.url));
          const mergedStorage = [...(parsed.uploadedStoragePhotos || []), ...missingDefaults];

          setBizForm({
            ...parsed,
            uploadedStoragePhotos: mergedStorage
          });
        }
      } catch {
        // ignore
      }
    });
  }, [fetchStats]);

  // Export Data to JSON
  const handleExportData = async (type) => {
    try {
      const res = await fetch(`/api/${type}`);
      const data = await res.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_boss_rent_${type}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert(`Backup data ${type} berhasil di-download.`);
    } catch {
      showAlert(`Gagal mengeksport data ${type}.`, 'danger');
    }
  };

  // Save Payment Method (Add / Edit)
  const handleSavePaymentMethod = (e) => {
    e.preventDefault();
    const id = paymentForm.id ? paymentForm.id : paymentForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newMethod = { ...paymentForm, id };

    let updated;
    if (editPayment) {
      updated = paymentMethods.map(m => m.id === editPayment.id ? newMethod : m);
    } else {
      updated = [...paymentMethods, newMethod];
    }

    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
    setShowPaymentModal(false);
    setEditPayment(null);
    showAlert('Metode pembayaran berhasil disimpan!');
  };

  // Toggle Payment Method Active Status
  const handleTogglePaymentActive = (id) => {
    const updated = paymentMethods.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
  };

  // Delete Payment Method
  const handleDeletePaymentMethod = (id) => {
    if (paymentMethods.length <= 1) {
      showAlert('Minimal harus ada 1 metode pembayaran aktif.', 'danger');
      return;
    }
    const updated = paymentMethods.filter(m => m.id !== id);
    setPaymentMethodsState(updated);
    savePaymentMethods(updated);
    showAlert('Metode pembayaran dihapus.');
  };

  // Reset Payment Methods to Default
  const handleResetPaymentMethods = () => {
    setPaymentMethodsState(DEFAULT_PAYMENT_METHODS);
    savePaymentMethods(DEFAULT_PAYMENT_METHODS);
    showAlert('Metode pembayaran dikembalikan ke default.');
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirmPass) {
      showAlert('Konfirmasi password baru tidak cocok.', 'danger');
      return;
    }
    if (passForm.newPass.length < 6) {
      showAlert('Password minimal 6 karakter.', 'danger');
      return;
    }

    setSavingPass(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passForm.newPass });
      if (error) {
        showAlert(error.message || 'Gagal mengubah password.', 'danger');
      } else {
        showAlert('Password berhasil diperbarui! Gunakan password baru saat login berikutnya.');
        setPassForm({ currentPass: '', newPass: '', confirmPass: '' });
      }
    } catch {
      showAlert('Terjadi kesalahan saat mengubah password.', 'danger');
    } finally {
      setSavingPass(false);
    }
  };

  // Save Business Settings
  const handleSaveBizSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('boss_rent_biz_settings', JSON.stringify(bizForm));
    if (bizForm.logoUrl) {
      updateFavicon(bizForm.logoUrl);
    }
    showAlert('✅ Pengaturan Operasional, Logo Brand & Favicon Browser Berhasil Diperbarui! Tampilan Web & Tab Browser Telah Di-Sinkronkan.');
  };

  return (
    <div className="fade-in">
      <Suspense fallback={null}>
        <TabFromQuery onTab={setActiveTab} />
      </Suspense>

      <div className="page-header">
        <h2><i className="fa-solid fa-gear" style={{ marginRight: '8px' }}></i> Pengaturan Sistem & Operasional</h2>
        <p>Kelola koneksi database, metode pembayaran, keamanan akun, dan konfigurasi rental</p>
      </div>

      {/* INTERACTIVE MODAL NOTIFICATION POP-UP WITH OK BUTTON */}
      {alert && (
        <div
          className="modal-overlay"
          style={{ zIndex: 999999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
          onClick={() => setAlert(null)}
        >
          <div
            className="modal modal-sm"
            onClick={e => e.stopPropagation()}
            style={{
              textAlign: 'center',
              padding: '28px 24px',
              borderRadius: '20px',
              border: `2px solid ${alert.type === 'danger' ? '#EF4444' : 'var(--brand-primary)'}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              background: '#0F172A',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              border: `2px solid ${alert.type === 'danger' ? '#EF4444' : '#22C55E'}`,
              color: alert.type === 'danger' ? '#EF4444' : '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px auto',
              boxShadow: `0 0 24px ${alert.type === 'danger' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`
            }}>
              <i className={alert.type === 'danger' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'}></i>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#F8FAFC', margin: '0 0 8px 0' }}>
              {alert.title || (alert.type === 'danger' ? 'Pemberitahuan System Error' : 'Berhasil Diperbarui ✓')}
            </h3>

            <p style={{ fontSize: '13.5px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '24px' }}>
              {alert.message}
            </p>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setAlert(null)}
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-check"></i> OK, Selesai
            </button>
          </div>
        </div>
      )}

      {/* Current section indicator — the section itself is now chosen from
          the sidebar "Pengaturan" dropdown, this just confirms what's showing */}
      {(() => {
        const TABS = [
          { id: 'storage', label: 'Database & Storage', icon: 'fa-solid fa-database' },
          { id: 'payment', label: 'Metode Pembayaran', icon: 'fa-solid fa-credit-card' },
          { id: 'wacustom', label: 'Template Invoice WA', icon: 'fa-brands fa-whatsapp' },
          { id: 'security', label: 'Keamanan & Password', icon: 'fa-solid fa-shield-halved' },
          { id: 'business', label: 'Operasional Rental', icon: 'fa-solid fa-sliders' },
          { id: 'staff', label: 'Akun Staff', icon: 'fa-solid fa-user-tie' },
          { id: 'delivery', label: 'Zona Delivery', icon: 'fa-solid fa-truck-fast' },
        ];
        const current = TABS.find(t => t.id === activeTab) || TABS[0];
        return (
          <div style={{ marginBottom: '16px' }}>
            <span className="badge" style={{
              background: 'var(--bg-elevated)', color: 'var(--brand-primary)', border: '1px solid var(--bg-border)',
              fontSize: '12.5px', padding: '6px 14px', fontWeight: 600,
            }}>
              <i className={current.icon} style={{ marginRight: '6px' }}></i>{current.label}
            </span>
          </div>
        );
      })()}

      {/* TAB 1: DATABASE & STORAGE */}
      {activeTab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Status Box */}
          <div className="card" style={{ borderLeft: '4px solid #22C55E' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(62, 207, 142, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3ECF8E', fontSize: '22px', border: '1px solid rgba(62, 207, 142, 0.3)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.35 2.54a1 1 0 0 0-1.7 0l-8.5 13.5A1 1 0 0 0 4 17.5h7v4a1 1 0 0 0 1.7 0l8.5-13.5a1 1 0 0 0-.85-1.5h-7v-3.96z" fill="#3ECF8E" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#3ECF8E' }}>Supabase PostgreSQL Cloud</span>
                    <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px' }}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '7px', marginRight: '4px' }}></i> Status Online
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Koneksi realtime database & storage berjalan normal (Region: ap-southeast-1 Singapore)
                  </div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={fetchStats}>
                <i className="fa-solid fa-rotate" style={{ marginRight: '4px' }}></i> Cek Koneksi
              </button>
            </div>
          </div>

          {/* Table Counts & Storage Cards */}
          <div className="grid-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
                <i className="fa-solid fa-motorcycle"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Vehicles</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.vehicles} Unit`}</div>
                <div className="stat-change">Armada motor terdaftar</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E' }}>
                <i className="fa-solid fa-file-invoice-dollar"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Transactions</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.transactions} Record`}</div>
                <div className="stat-change">Riwayat sewa kendaraan</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                <i className="fa-solid fa-money-bill-transfer"></i>
              </div>
              <div className="stat-info">
                <div className="stat-label">Tabel Expenses</div>
                <div className="stat-value">{loadingStats ? '...' : `${stats.expenses} Record`}</div>
                <div className="stat-change">Pencatatan pengeluaran</div>
              </div>
            </div>
          </div>

          {/* Export / Backup & Restore Section */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-box-archive" style={{ color: 'var(--brand-primary-light)' }}></i>
              1-Click Backup & Pemulihan (Restore) Database
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Unduh seluruh database (Armada, Transaksi, Pengeluaran, Pengaturan) dalam 1 file cadangan `.json`, atau pulihkan data dari file cadangan sebelumnya.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-cloud-arrow-down" style={{ color: '#3B82F6', fontSize: '18px' }}></i>
                  Download Full Backup (.json)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Mengunduh seluruh data aplikasi (Motor, Transaksi, Pengeluaran, & Settings) dalam 1 file JSON bertanggal.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleFullBackupDownload}
                  disabled={backupLoading}
                  style={{ marginTop: 'auto', width: '100%', background: '#3B82F6', borderColor: '#3B82F6' }}
                >
                  {backupLoading ? (
                    <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Mengunduh Backup...</>
                  ) : (
                    <><i className="fa-solid fa-download" style={{ marginRight: '6px' }}></i> Download Full Backup (.json)</>
                  )}
                </button>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--bg-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#22C55E', fontSize: '18px' }}></i>
                  Restore / Import Backup (.json)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Unggah file cadangan `.json` untuk memulihkan seluruh data dan pengaturan ke database aplikasi.
                </div>
                <label className="btn btn-success" style={{ marginTop: 'auto', width: '100%', textAlign: 'center', cursor: 'pointer', background: '#22C55E', borderColor: '#22C55E', color: '#fff', fontWeight: 600 }}>
                  <i className="fa-solid fa-upload" style={{ marginRight: '6px' }}></i> Pilih File Backup (.json) untuk Restore
                  <input type="file" accept=".json" onChange={handleSelectRestoreFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--bg-border)', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Ekspor Parsial Satuan:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('transactions')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Transaksi (.json)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('vehicles')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Data Motor (.json)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleExportData('expenses')}>
                  <i className="fa-solid fa-file-export" style={{ marginRight: '6px' }}></i> Export Pengeluaran (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METODE PEMBAYARAN (DYNAMIC PAYMENT ADJUSTER) */}
      {activeTab === 'payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  <i className="fa-solid fa-credit-card" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
                  Pengaturan Metode Pembayaran
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Tambah, edit, atau nonaktifkan pilihan metode pembayaran yang tampil saat membuat transaksi sewa
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleResetPaymentMethods}>
                  <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default
                </button>
                <button className="btn btn-primary" onClick={() => { setEditPayment(null); setPaymentForm({ id: '', label: '', icon: 'fa-solid fa-building-columns', color: '#3B82F6', active: true }); setShowPaymentModal(true); }}>
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Metode Baru
                </button>
              </div>
            </div>

            {/* Payment Methods List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: `1px solid ${method.active ? 'var(--bg-border)' : 'rgba(239, 68, 68, 0.2)'}`,
                    background: method.active ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.2)',
                    opacity: method.active ? 1 : 0.6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: `${method.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: method.color, fontSize: '18px'
                    }}>
                      <i className={method.icon}></i>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {method.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ID System: <code>{method.id}</code> | Status: {method.active ? <span style={{ color: '#22C55E' }}>Aktif ✓</span> : <span style={{ color: '#EF4444' }}>Non-Aktif ✕</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className={`btn btn-${method.active ? 'secondary' : 'success'} btn-sm`}
                      onClick={() => handleTogglePaymentActive(method.id)}
                      title={method.active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      <i className={`fa-solid ${method.active ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      {method.active ? ' Sembunyikan' : ' Tampilkan'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEditPayment(method); setPaymentForm(method); setShowPaymentModal(true); }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEMPLATE WHATSAPP CUSTOM (INVOICE & REMINDER) */}
      {activeTab === 'wacustom' && (
        <div style={{ maxWidth: '100%' }}>
          <div className="card">
            {/* Header & Sub-tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-brands fa-whatsapp" style={{ color: '#25D366', fontSize: '22px' }}></i>
                  Custom Format Text WhatsApp (Dual Templates)
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Kelola template pesan otomatis WhatsApp untuk Invoice Transaksi & Pengingat Masa Sewa (Tracking)
                </p>
              </div>
            </div>

            {/* Sub-tab Selector Chips / Pills Bar */}
            <div className="scrollable-tabs-bar">
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'invoice' ? 'active' : ''}`}
                onClick={() => setWaSubTab('invoice')}
              >
                <i className="fa-solid fa-file-invoice"></i> 1. Template Invoice WA
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'reminder' ? 'active' : ''}`}
                onClick={() => setWaSubTab('reminder')}
              >
                <i className="fa-solid fa-bell"></i> 2. Template Reminder WA (Pengingat)
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${waSubTab === 'gateway' ? 'active' : ''}`}
                onClick={() => setWaSubTab('gateway')}
              >
                <i className="fa-solid fa-robot"></i> 3. 🤖 WhatsApp Gateway API Config
              </button>
            </div>

            {/* Alert Banner */}
            {waSavedAlert && (
              <div className="alert alert-success mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E', padding: '14px 18px', borderRadius: '10px' }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    Template WhatsApp {waSavedAlert === 'invoice' ? 'Invoice' : 'Reminder (Pengingat)'} Berhasil Diperbarui!
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    Format baru telah aktif dan akan digunakan secara otomatis oleh sistem.
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 1: INVOICE TEMPLATE */}
            {waSubTab === 'invoice' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-file-invoice" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i>
                    Format Pesan WhatsApp Invoice Transaksi
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetWaInvoiceTemplate}>
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default Invoice
                  </button>
                </div>

                <form onSubmit={handleSaveWaInvoiceTemplate}>
                  {/* Tag Placeholder Quick Buttons */}
                  <div style={{ marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Klik Tag Untuk Sisipkan Variabel Dinamis Invoice:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { tag: '{RENTER_NAME}', label: 'Nama Penyewa' },
                        { tag: '{RENTER_PHONE}', label: 'No Phone' },
                        { tag: '{VEHICLE_NAME}', label: 'Nama Motor' },
                        { tag: '{PLATE_NUMBER}', label: 'Plat Motor' },
                        { tag: '{START_DATE}', label: 'Tgl Mulai' },
                        { tag: '{END_DATE}', label: 'Tgl Selesai' },
                        { tag: '{DURATION_DAYS}', label: 'Durasi Hari' },
                        { tag: '{DAILY_RATE}', label: 'Tarif Harian' },
                        { tag: '{TOTAL_PRICE}', label: 'Total Biaya' },
                        { tag: '{DEPOSIT}', label: 'Deposit' },
                        { tag: '{PAYMENT_METHOD}', label: 'Metode Bayar' },
                        { tag: '{PAYMENT_STATUS}', label: 'Status Lunas' },
                        { tag: '{SHOP_NAME}', label: 'Nama Rental' },
                        { tag: '{SHOP_PHONE}', label: 'No HP Rental' },
                        { tag: '{SHOP_LOCATION}', label: 'Lokasi Rental' },
                      ].map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertInvoiceTag(t.tag)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid var(--brand-primary)',
                            background: 'rgba(37, 99, 235, 0.12)',
                            color: 'var(--brand-primary-light)',
                            cursor: 'pointer'
                          }}
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <textarea
                      className="form-control"
                      rows={14}
                      value={waInvoiceText}
                      onChange={e => setWaInvoiceText(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
                      required
                    />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn btn-success" style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 700 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Template Invoice WA
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: REMINDER TEMPLATE */}
            {waSubTab === 'reminder' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <i className="fa-solid fa-bell" style={{ marginRight: '6px', color: '#F59E0B' }}></i>
                    Format Pesan WhatsApp Reminder (Tracking Sewa)
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleResetWaReminderTemplate}>
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i> Reset Default Reminder
                  </button>
                </div>

                <form onSubmit={handleSaveWaReminderTemplate}>
                  {/* Tag Placeholder Quick Buttons */}
                  <div style={{ marginBottom: '12px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Klik Tag Untuk Sisipkan Variabel Dinamis Reminder:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { tag: '{RENTER_NAME}', label: 'Nama Penyewa' },
                        { tag: '{RENTER_PHONE}', label: 'No Phone' },
                        { tag: '{VEHICLE_NAME}', label: 'Nama Motor' },
                        { tag: '{PLATE_NUMBER}', label: 'Plat Motor' },
                        { tag: '{START_DATE}', label: 'Tgl Mulai' },
                        { tag: '{END_DATE}', label: 'Tgl Selesai' },
                        { tag: '{TIME_LEFT_STATUS}', label: 'Status Sisa Hari/Overdue' },
                        { tag: '{SHOP_NAME}', label: 'Nama Rental' },
                        { tag: '{SHOP_PHONE}', label: 'No HP Rental' },
                        { tag: '{SHOP_LOCATION}', label: 'Lokasi Rental' },
                      ].map(t => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => handleInsertReminderTag(t.tag)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid #F59E0B',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#F59E0B',
                            cursor: 'pointer'
                          }}
                        >
                          + {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <textarea
                      className="form-control"
                      rows={14}
                      value={waReminderText}
                      onChange={e => setWaReminderText(e.target.value)}
                      style={{ fontFamily: 'monospace', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical' }}
                      required
                    />
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <button type="submit" className="btn btn-success" style={{ width: '100%', background: '#25D366', borderColor: '#25D366', color: '#fff', fontWeight: 700 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Template Reminder WA
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 3: GATEWAY API CONFIG */}
            {waSubTab === 'gateway' && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-robot" style={{ color: 'var(--brand-primary)' }}></i>
                  Konfigurasi WhatsApp Gateway API (Auto-Send Pesan)
                </div>

                <form onSubmit={handleSaveWaGateway}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={waGatewayForm.enabled}
                        onChange={e => setWaGatewayForm(p => ({ ...p, enabled: e.target.checked }))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
                      />
                      <span>Aktifkan Pengiriman Otomatis via WA Gateway API</span>
                    </label>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '28px' }}>
                      Jika tidak diaktifkan, sistem akan mengalihkan ke WhatsApp Web/App Direct Link.
                    </div>
                  </div>

                  <div className="form-row cols-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-provider">
                        <i className="fa-solid fa-server" style={{ marginRight: '6px' }}></i> Provider Gateway
                      </label>
                      <select
                        id="wa-provider"
                        className="form-control"
                        value={waGatewayForm.provider}
                        onChange={e => setWaGatewayForm(p => ({ ...p, provider: e.target.value }))}
                      >
                        <option value="fonnte">Fonnte API (Indonesia / Recommended)</option>
                        <option value="wablas">Wablas Gateway API</option>
                        <option value="webhook">Custom Webhook Endpoint API</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-token">
                        <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> API Key / Token <span className="required">*</span>
                      </label>
                      <input
                        id="wa-token"
                        type="password"
                        className="form-control"
                        placeholder="e.g. fonnte_token_xyz"
                        value={waGatewayForm.token}
                        onChange={e => setWaGatewayForm(p => ({ ...p, token: e.target.value }))}
                      />
                    </div>
                  </div>

                  {waGatewayForm.provider !== 'fonnte' && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="wa-endpoint">
                        <i className="fa-solid fa-link" style={{ marginRight: '6px' }}></i> Target Endpoint URL
                      </label>
                      <input
                        id="wa-endpoint"
                        type="url"
                        className="form-control"
                        placeholder="https://api.custom-gateway.com/send"
                        value={waGatewayForm.endpoint}
                        onChange={e => setWaGatewayForm(p => ({ ...p, endpoint: e.target.value }))}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Konfigurasi Gateway
                    </button>
                  </div>
                </form>

                {/* TEST SENDER PANEL */}
                <div style={{ marginTop: '24px', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--brand-primary)' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--brand-primary-light)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-vial"></i> Uji Coba (Test Send) WA Gateway
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nomor HP Tes (e.g. 628123456789)"
                      value={testGatewayPhone}
                      onChange={e => setTestGatewayPhone(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={handleTestWaGateway}
                      disabled={testingGateway}
                      style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    >
                      {testingGateway ? (
                        <><i className="fa-solid fa-spinner fa-spin"></i> Mengirim...</>
                      ) : (
                        <><i className="fa-paper-plane fa-solid"></i> Kirim Tes WA</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KEAMANAN & PASSWORD */}
      {activeTab === 'security' && (
        <div style={{ maxWidth: '100%' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '8px', color: 'var(--brand-primary-light)' }}></i>
              Ubah Password Administrator
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Perbarui password akun Admin Panel Demo Rental Preview untuk menjaga keamanan data
            </p>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="sec-new-pass">
                  <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i> Password Baru <span className="required">*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sec-new-pass"
                    type={showPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Minimal 6 karakter"
                    value={passForm.newPass}
                    onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sec-confirm-pass">
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i> Konfirmasi Password Baru <span className="required">*</span>
                </label>
                <input
                  id="sec-confirm-pass"
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Ulangi password baru"
                  value={passForm.confirmPass}
                  onChange={e => setPassForm(p => ({ ...p, confirmPass: e.target.value }))}
                  required
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" disabled={savingPass} style={{ width: '100%' }}>
                  {savingPass ? (
                    <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Menyimpan Password...</>
                  ) : (
                    <><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Password Baru</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: ZONA DELIVERY */}
      {activeTab === 'delivery' && (
        <div style={{ maxWidth: '100%' }}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Zona Delivery</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Atur area & biaya delivery. Biaya ini yang muncul ke customer di form booking, dan dibagi full ke driver yang mengantar.
                </p>
              </div>
              <button className="btn btn-primary" onClick={openAddZone}>
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Tambah Zona
              </button>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
              <i className="fa-solid fa-circle-info" style={{ color: '#3B82F6', marginTop: '2px' }}></i>
              <span>
                Toko kita ada di <strong>Sunset Road, Kuta</strong> — biaya tiap zona dihitung dari jarak lokasi itu. Pastikan biayanya masih akurat ya kalau ada area baru atau perubahan jarak.
              </span>
            </div>

            <div className="table-wrapper">
              {zoneLoading ? (
                <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
              ) : zoneList.length === 0 ? (
                <div className="table-empty">
                  <div className="table-empty-icon"><i className="fa-solid fa-map-location-dot"></i></div>
                  <p>Belum ada zona delivery.</p>
                </div>
              ) : (
                <table className="table table--stack-mobile">
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Zona</th>
                      <th>Biaya Delivery</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zoneList.map((z) => (
                      <tr key={z.id}>
                        <td data-label="Area"><strong>{z.name}</strong></td>
                        <td data-label="Zona">
                          <span className="badge" style={{ background: `${z.color}22`, color: z.color, border: `1px solid ${z.color}` }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: z.color, marginRight: '6px' }}></span>
                            {z.zone_label}
                          </span>
                        </td>
                        <td data-label="Biaya Delivery" style={{ fontWeight: 800 }}>{formatRupiah(z.fee)}</td>
                        <td data-label="Aksi" data-label-align="left">
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => openEditZone(z)}>
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Hapus" onClick={() => handleZoneDelete(z)}>
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {zoneModalOpen && (
            <div className="modal-overlay" onClick={() => setZoneModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editingZone ? 'Edit Zona' : 'Tambah Zona Baru'}</div>
                  <button className="modal-close" onClick={() => setZoneModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handleZoneSave}>
                  <div className="form-group">
                    <label className="form-label">Nama Area</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Uluwatu"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Label Zona</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Zona Biru"
                      value={zoneForm.zone_label}
                      onChange={(e) => setZoneForm(p => ({ ...p, zone_label: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Warna</label>
                      <input
                        type="color"
                        className="form-control"
                        style={{ height: '42px', padding: '4px' }}
                        value={zoneForm.color}
                        onChange={(e) => setZoneForm(p => ({ ...p, color: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Biaya Delivery (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="75000"
                        value={zoneForm.fee}
                        onChange={(e) => setZoneForm(p => ({ ...p, fee: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {zoneError && (
                    <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{zoneError}
                    </div>
                  )}

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setZoneModalOpen(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={zoneSaving}>
                      {zoneSaving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: AKUN STAFF (Admin / Driver) */}
      {activeTab === 'staff' && (
        <div style={{ maxWidth: '100%' }}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Akun Staff</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Kelola akun Admin & Driver yang bisa login ke panel ini.
                </p>
              </div>
              <button className="btn btn-primary" onClick={openAddStaff}>
                <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i> Tambah Staff
              </button>
            </div>

            <div className="table-wrapper">
              {staffLoading ? (
                <div className="table-empty"><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Memuat data...</div>
              ) : staffList.length === 0 ? (
                <div className="table-empty">
                  <div className="table-empty-icon"><i className="fa-solid fa-user-tie"></i></div>
                  <p>Belum ada akun staff.</p>
                </div>
              ) : (
                <table className="table table--stack-mobile">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Telepon</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s) => (
                      <tr key={s.id}>
                        <td data-label="Nama"><strong>{s.full_name}</strong></td>
                        <td data-label="Email" style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{s.email}</td>
                        <td data-label="Role">
                          <span className="badge" style={{
                            background: s.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                            color: s.role === 'admin' ? '#8B5CF6' : '#3B82F6',
                            border: `1px solid ${s.role === 'admin' ? '#8B5CF6' : '#3B82F6'}`,
                          }}>
                            <i className={`fa-solid ${s.role === 'admin' ? 'fa-user-shield' : 'fa-motorcycle'}`} style={{ marginRight: '4px' }}></i>
                            {s.role === 'admin' ? 'Admin' : 'Driver'}
                          </span>
                        </td>
                        <td data-label="Telepon" style={{ fontSize: '12.5px' }}>{s.phone || '-'}</td>
                        <td data-label="Aksi" data-label-align="left">
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {s.role === 'driver' && unpaidByStaff[s.id] > 0 && (
                              <button
                                className="btn btn-sm"
                                title="Ada ongkos delivery/gaji belum dibayar"
                                onClick={() => openPayoutModal(s)}
                                style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid #F59E0B', fontSize: '11px', fontWeight: 700 }}
                              >
                                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                                {formatRupiah(unpaidByStaff[s.id])}
                              </button>
                            )}
                            {s.role === 'driver' && (
                              <button className="btn btn-sm" title="Input Pemasukan (Gaji, Bonus, dll)" onClick={() => openIncomeModal(s)} style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid #22C55E' }}>
                                <i className="fa-solid fa-sack-dollar"></i>
                              </button>
                            )}
                            <button className="btn btn-secondary btn-sm" title="Edit" onClick={() => openEditStaff(s)}>
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Hapus" onClick={() => handleStaffDelete(s)}>
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {staffModalOpen && (
            <div className="modal-overlay" onClick={() => setStaffModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">{editingStaff ? 'Edit Staff' : 'Tambah Staff Baru'}</div>
                  <button className="modal-close" onClick={() => setStaffModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handleStaffSave}>
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap</label>
                    <input
                      type="text"
                      className="form-control"
                      value={staffForm.full_name}
                      onChange={(e) => setStaffForm(p => ({ ...p, full_name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email {editingStaff && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tidak bisa diubah)</span>}</label>
                    <input
                      type="email"
                      className="form-control"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm(p => ({ ...p, email: e.target.value }))}
                      disabled={!!editingStaff}
                      required={!editingStaff}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {editingStaff ? 'Ganti Password (opsional)' : 'Password'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder={editingStaff ? 'Kosongkan jika tidak diganti' : 'Minimal 6 karakter'}
                      value={staffForm.password}
                      onChange={(e) => setStaffForm(p => ({ ...p, password: e.target.value }))}
                      required={!editingStaff}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                      {[
                        { key: 'admin', label: 'Admin', icon: 'fa-solid fa-user-shield' },
                        { key: 'driver', label: 'Driver', icon: 'fa-solid fa-motorcycle' },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setStaffForm(p => ({ ...p, role: opt.key }))}
                          style={{
                            padding: '10px', borderRadius: '10px', cursor: 'pointer',
                            border: staffForm.role === opt.key ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                            background: staffForm.role === opt.key ? 'var(--brand-primary-bg, rgba(59,130,246,0.1))' : 'transparent',
                            color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          }}
                        >
                          <i className={opt.icon}></i> {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Nomor Telepon (opsional)</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  {staffError && (
                    <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{staffError}
                    </div>
                  )}

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setStaffModalOpen(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={staffSaving}>
                      {staffSaving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {incomeModalStaff && (
            <div className="modal-overlay" onClick={() => setIncomeModalStaff(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">Input Pemasukan Driver</div>
                    <div className="modal-subtitle">Buat {incomeModalStaff.full_name} — gaji, bonus, dll. Muncul di dashboard driver ybs.</div>
                  </div>
                  <button className="modal-close" onClick={() => setIncomeModalStaff(null)}>✕</button>
                </div>
                <form onSubmit={handleIncomeSave}>
                  <div className="form-group">
                    <label className="form-label">Judul</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Gaji September, Bonus, dll."
                      value={incomeForm.title}
                      onChange={(e) => setIncomeForm(p => ({ ...p, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Jumlah (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={incomeForm.amount}
                        onChange={(e) => setIncomeForm(p => ({ ...p, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tanggal</label>
                      <input
                        type="date"
                        className="form-control"
                        value={incomeForm.expense_date}
                        onChange={(e) => setIncomeForm(p => ({ ...p, expense_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan (opsional)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={incomeForm.notes}
                      onChange={(e) => setIncomeForm(p => ({ ...p, notes: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  {incomeError && (
                    <div className="alert alert-danger" style={{ marginBottom: '12px' }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{incomeError}
                    </div>
                  )}
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setIncomeModalStaff(null)}>Batal</button>
                    <button type="submit" className="btn btn-primary" disabled={incomeSaving}>
                      {incomeSaving ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Menyimpan...</> : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {payoutModalStaff && (
            <div className="modal-overlay" onClick={() => setPayoutModalStaff(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <div className="modal-title">Pembayaran {payoutModalStaff.full_name}</div>
                    <div className="modal-subtitle">Ongkos delivery & pemasukan lain yang belum dibayar</div>
                  </div>
                  <button className="modal-close" onClick={() => setPayoutModalStaff(null)}>✕</button>
                </div>

                {payoutEntries.length === 0 ? (
                  <div className="table-empty" style={{ padding: '24px' }}>
                    <p>Semua sudah lunas 🎉</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {payoutEntries.map((entry) => (
                      <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>{entry.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.expense_date}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontWeight: 800, color: '#F59E0B' }}>{formatRupiah(entry.amount)}</div>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={payoutBusyId === entry.id}
                            onClick={() => markPayoutPaid(entry.id)}
                          >
                            {payoutBusyId === entry.id ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Tandai Lunas'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setPayoutModalStaff(null)}>Tutup</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENGATURAN OPERASIONAL RENTAL & CMS WEB PUBLIK */}
      {activeTab === 'business' && (
        <div style={{ maxWidth: '100%' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-sliders" style={{ color: 'var(--brand-primary-light)' }}></i>
                  Pengaturan Operasional & CMS Web Publik
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Kelola profil usaha, banner utama, rating pelanggan, galeri foto, dan pertanyaan FAQ
                </p>
              </div>
            </div>

            {/* Sub-tab Pills Selector for Operasional & CMS Web Publik */}
            <div className="scrollable-tabs-bar" style={{ marginBottom: '20px' }}>
              <button
                type="button"
                className={`scrollable-tab-btn ${cmsSubTab === 'profile' ? 'active' : ''}`}
                onClick={() => setCmsSubTab('profile')}
              >
                <i className="fa-solid fa-store"></i> 1. Profil Usaha & Kontak
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${cmsSubTab === 'hero' ? 'active' : ''}`}
                onClick={() => setCmsSubTab('hero')}
              >
                <i className="fa-solid fa-pen-to-square"></i> 2. Banner Hero & Rating
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${cmsSubTab === 'gallery' ? 'active' : ''}`}
                onClick={() => setCmsSubTab('gallery')}
              >
                <i className="fa-solid fa-images"></i> 3. Galeri Foto Web
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${cmsSubTab === 'faqs' ? 'active' : ''}`}
                onClick={() => setCmsSubTab('faqs')}
              >
                <i className="fa-solid fa-circle-question"></i> 4. FAQ Manager
              </button>
              <button
                type="button"
                className={`scrollable-tab-btn ${cmsSubTab === 'storage_gallery' ? 'active' : ''}`}
                onClick={() => setCmsSubTab('storage_gallery')}
              >
                <i className="fa-solid fa-hard-drive"></i> 5. Storage Galeri Foto Web
              </button>
            </div>

            <form onSubmit={handleSaveBizSettings}>
              {/* SUB-TAB 1: PROFIL USAHA & KONTAK */}
              {cmsSubTab === 'profile' && (
                <div>
                  {/* Editable Brand Logo Manager Card */}
                  <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '14px', border: '1px solid var(--bg-border)', marginBottom: '20px' }}>
                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-primary-light)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-image"></i> Logo Brand Perusahaan (Tampil di Sidebar, Header Admin & Web Customer)
                    </label>
                    <div className="settings-logo-grid">
                      <div className="settings-logo-preview-box" style={{ background: '#FFF', padding: '10px', borderRadius: '10px', border: '1px solid var(--bg-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={bizForm.logoUrl || '/images/logoCompany.png'} alt="Logo Preview" style={{ maxHeight: '56px', maxWidth: '100%', width: 'auto', objectFit: 'contain' }} />
                      </div>
                      <div className="settings-logo-upload-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', width: '100%' }}>
                          <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--brand-primary)', fontSize: '15px' }}></i>
                          <span style={{ fontWeight: 700 }}>Upload Logo Baru Dari HP / Laptop</span>
                          <input type="file" accept="image/*" onChange={handleLogoFileUpload} style={{ display: 'none' }} />
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: '11.5px', width: '100%' }}
                          placeholder="URL / Path Logo Custom (/images/logoCompany.png atau data:image/...)"
                          value={bizForm.logoUrl || ''}
                          onChange={e => setBizForm(p => ({ ...p, logoUrl: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="biz-name">
                      <i className="fa-solid fa-building" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Nama Rental / Perusahaan <span className="required">*</span>
                    </label>
                    <input
                      id="biz-name"
                      type="text"
                      className="form-control"
                      value={bizForm.name}
                      onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="biz-location">
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Lokasi Alamat Store / Garasi
                    </label>
                    <input
                      id="biz-location"
                      type="text"
                      className="form-control"
                      value={bizForm.location}
                      onChange={e => setBizForm(p => ({ ...p, location: e.target.value }))}
                    />
                  </div>

                  <div className="form-row cols-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="biz-ig-handle">
                        <i className="fa-brands fa-instagram" style={{ marginRight: '6px', color: '#E1306C' }}></i> Instagram Handle
                      </label>
                      <input
                        id="biz-ig-handle"
                        type="text"
                        className="form-control"
                        placeholder="@demorentalpreview"
                        value={bizForm.instagramHandle}
                        onChange={e => setBizForm(p => ({ ...p, instagramHandle: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="biz-ig-url">
                        <i className="fa-solid fa-link" style={{ marginRight: '6px', color: '#3B82F6' }}></i> Instagram Profile Link
                      </label>
                      <input
                        id="biz-ig-url"
                        type="text"
                        className="form-control"
                        placeholder="https://instagram.com/..."
                        value={bizForm.instagramUrl}
                        onChange={e => setBizForm(p => ({ ...p, instagramUrl: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="biz-tagline">
                      <i className="fa-solid fa-bullhorn" style={{ marginRight: '6px', color: '#2563EB' }}></i> Tagline Running Announcement Web Publik
                    </label>
                    <input
                      id="biz-tagline"
                      type="text"
                      className="form-control"
                      value={bizForm.tagline}
                      onChange={e => setBizForm(p => ({ ...p, tagline: e.target.value }))}
                    />
                  </div>

                  <div className="form-row cols-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="biz-phone">
                        <i className="fa-solid fa-phone" style={{ marginRight: '6px', color: '#22C55E' }}></i> No. WhatsApp Admin / Hotline
                      </label>
                      <input
                        id="biz-phone"
                        type="text"
                        className="form-control"
                        value={bizForm.phone}
                        onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="biz-deposit">
                        <i className="fa-solid fa-vault" style={{ marginRight: '6px', color: '#F59E0B' }}></i> Default Deposit (Rp)
                      </label>
                      <input
                        id="biz-deposit"
                        type="number"
                        className="form-control"
                        value={bizForm.defaultDeposit}
                        onChange={e => setBizForm(p => ({ ...p, defaultDeposit: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: BANNER HERO & RATING STATS */}
              {cmsSubTab === 'hero' && (
                <div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cms-hero-title">
                      <i className="fa-solid fa-heading" style={{ marginRight: '6px' }}></i> Judul Utama Hero Banner (H1)
                    </label>
                    <input
                      id="cms-hero-title"
                      type="text"
                      className="form-control"
                      value={bizForm.heroTitle || ''}
                      onChange={e => setBizForm(p => ({ ...p, heroTitle: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="cms-hero-subtitle">
                      <i className="fa-solid fa-align-left" style={{ marginRight: '6px' }}></i> Subtitle Deskripsi Banner
                    </label>
                    <textarea
                      id="cms-hero-subtitle"
                      className="form-control"
                      rows={3}
                      value={bizForm.heroSubtitle || ''}
                      onChange={e => setBizForm(p => ({ ...p, heroSubtitle: e.target.value }))}
                    />
                  </div>

                  <div className="form-row cols-2 mb-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="cms-rating">
                        <i className="fa-solid fa-star" style={{ color: '#F59E0B', marginRight: '6px' }}></i> Google Rating Score
                      </label>
                      <input
                        id="cms-rating"
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        className="form-control"
                        value={bizForm.rating || 5.0}
                        onChange={e => setBizForm(p => ({ ...p, rating: parseFloat(e.target.value) || 5.0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cms-reviews">
                        <i className="fa-solid fa-comments" style={{ marginRight: '6px' }}></i> Total Google Reviews
                      </label>
                      <input
                        id="cms-reviews"
                        type="number"
                        className="form-control"
                        value={bizForm.reviewsCount || 24}
                        onChange={e => setBizForm(p => ({ ...p, reviewsCount: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  <div className="form-row cols-2 mb-4">
                    <div className="form-group">
                      <label className="form-label" htmlFor="cms-satisfaction">
                        <i className="fa-solid fa-face-smile" style={{ color: '#22C55E', marginRight: '6px' }}></i> Customer Satisfaction (%)
                      </label>
                      <input
                        id="cms-satisfaction"
                        type="number"
                        min="1"
                        max="100"
                        className="form-control"
                        value={bizForm.satisfactionPercent || 100}
                        onChange={e => setBizForm(p => ({ ...p, satisfactionPercent: parseInt(e.target.value) || 100 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cms-scooters">
                        <i className="fa-solid fa-motorcycle" style={{ color: '#2563EB', marginRight: '6px' }}></i> Clean Scooters Fleet Count
                      </label>
                      <input
                        id="cms-scooters"
                        type="number"
                        className="form-control"
                        value={bizForm.cleanScootersCount || 50}
                        onChange={e => setBizForm(p => ({ ...p, cleanScootersCount: parseInt(e.target.value) || 50 }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: GALERI FOTO WEB SHOWCASE */}
              {cmsSubTab === 'gallery' && (
                <div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--bg-border)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-primary-light)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-circle-info"></i> Konsep Galeri Foto Landing Page (Drag & Drop Urutan Foto)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      💡 <strong>Petunjuk Adjust Urutan:</strong> Klik & Tahan ikon grip <i className="fa-solid fa-grip-vertical"></i> lalu <strong>Drag & Drop dengan kursor</strong> untuk menggeser urutan foto! Atau gunakan tombol panah <i className="fa-solid fa-arrow-up"></i> / <i className="fa-solid fa-arrow-down"></i>. <strong>Foto #1 s/d #6</strong> akan tampil secara default di halaman depan (Grid 3x2 Desktop).
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-primary-light)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-images"></i> Daftar Foto Showcase Landing Page ({bizForm.galleryPhotos?.length || 0} Foto Total)
                    </h4>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPhotoModal(true)}>
                      <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Form Tambah Foto Baru
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(bizForm.galleryPhotos || []).map((photo, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className="gallery-item-responsive-card"
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: idx < 6 ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                          display: 'grid',
                          gridTemplateColumns: '32px 90px 1fr auto',
                          gap: '14px',
                          alignItems: 'center',
                          cursor: 'grab',
                          opacity: draggedPhotoIdx === idx ? 0.4 : 1,
                          boxShadow: draggedPhotoIdx === idx ? '0 0 10px rgba(37, 99, 235, 0.4)' : 'none',
                          transition: 'transform 0.15s ease, border 0.15s ease'
                        }}
                      >
                        {/* Drag Handle Grip */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '16px' }} title="Geser (Drag & Drop) untuk ubah urutan">
                          <i className="fa-solid fa-grip-vertical" style={{ cursor: 'grab' }}></i>
                        </div>

                        {/* Thumbnail Image */}
                        <div style={{ position: 'relative' }}>
                          <img src={photo.url} alt={photo.title} style={{ width: '90px', height: '68px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--bg-border)' }} />
                          <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(15,23,42,0.88)', color: '#FFF', fontSize: '10px', padding: '2px 6px', fontWeight: 800, borderRadius: '4px' }}>
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Photo Form Inputs */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {idx < 6 ? (
                              <span style={{ fontSize: '10px', background: '#22C55E', color: '#FFF', padding: '3px 8px', fontWeight: 800, borderRadius: '4px' }}>
                                📌 [1-6] Tampil Default Halaman Utama (Grid 3x2)
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', background: '#3B82F6', color: '#FFF', padding: '3px 8px', fontWeight: 800, borderRadius: '4px' }}>
                                👁️ [#{idx + 1}] Tampil saat Customer Klik &quot;See More&quot;
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '12px' }}
                              placeholder="Judul Foto (Title)..."
                              value={photo.title}
                              onChange={e => handleUpdateGalleryPhoto(idx, 'title', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-control"
                              style={{ fontSize: '11px' }}
                              placeholder="URL / Path Foto (/images/...)"
                              value={photo.url}
                              onChange={e => handleUpdateGalleryPhoto(idx, 'url', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Reorder Up/Down & Delete Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => handleMovePhotoUp(idx)}
                              disabled={idx === 0}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11px', opacity: idx === 0 ? 0.4 : 1 }}
                              title="Naikkan Urutan (Up)"
                            >
                              <i className="fa-solid fa-arrow-up"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePhotoDown(idx)}
                              disabled={idx === (bizForm.galleryPhotos?.length || 1) - 1}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11px', opacity: idx === (bizForm.galleryPhotos?.length || 1) - 1 ? 0.4 : 1 }}
                              title="Turunkan Urutan (Down)"
                            >
                              <i className="fa-solid fa-arrow-down"></i>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryPhoto(idx)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, width: '100%' }}
                            title="Hapus Foto Ini"
                          >
                            <i className="fa-solid fa-trash-can"></i> Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: FAQ MANAGER */}
              {cmsSubTab === 'faqs' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-primary-light)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-circle-question"></i> Kelola Pertanyaan FAQ (Public Web)
                    </h4>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFaq}>
                      <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Tambah FAQ Baru
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(bizForm.faqs || []).map((faq, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-elevated)', padding: '14px', borderRadius: '10px', border: '1px solid var(--bg-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-primary-light)' }}>
                            FAQ #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaq(idx)}
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                          >
                            <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i> Hapus
                          </button>
                        </div>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Judul Pertanyaan (English)..."
                            value={faq.q}
                            onChange={e => handleUpdateFaq(idx, 'q', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <textarea
                            className="form-control"
                            rows={2}
                            placeholder="Jawaban Penjelasan (English)..."
                            value={faq.a}
                            onChange={e => handleUpdateFaq(idx, 'a', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: STORAGE GALERI FOTO WEB (DIRECT FILE UPLOADER) */}
              {cmsSubTab === 'storage_gallery' && (
                <div>
                  <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: '14px', border: '2px dashed var(--brand-primary)', textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ fontSize: '36px', color: 'var(--brand-primary)', marginBottom: '8px' }}>
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--brand-primary-light)', margin: '0 0 6px 0' }}>
                      Upload Foto Baru Langsung Dari Perangkat (HP / Laptop)
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px', maxWidth: '540px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                      Klien/Admin dapat langsung memilih file foto dari Galeri HP atau Laptop. Foto akan otomatis disimpan ke Storage Repositori tanpa perlu memasukkan URL atau mengetik kode file!
                    </p>

                    <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '13px', fontWeight: 800 }}>
                      <i className="fa-solid fa-folder-open"></i>
                      <span>Pilih & Upload Foto Dari HP / Laptop</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUploadToStorage}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-primary-light)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-hard-drive"></i> Repositori Storage Galeri Foto ({bizForm.uploadedStoragePhotos?.length || 0} Foto Tersimpan)
                    </h4>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadGalleryBackup}>
                      <i className="fa-solid fa-download" style={{ marginRight: '6px', color: '#22C55E' }}></i> Download Backup Galeri Foto (JSON Archive)
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                    {(bizForm.uploadedStoragePhotos || []).map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid var(--bg-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <img src={photo.url} alt={photo.title} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--bg-border)' }} />
                        <div style={{ fontSize: '11.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {photo.title}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => handleUseStoragePhotoInGallery(photo)}
                            className="btn btn-primary btn-sm"
                            style={{ flex: 1, padding: '6px 8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            title="Gunakan foto ini ke landing page"
                          >
                            <i className="fa-solid fa-plus"></i> Pakai Di Web
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStoragePhoto(photo.id)}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                            title="Hapus dari storage"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--bg-border)', paddingTop: '16px' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Pengaturan CMS Web Publik
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT METODE PEMBAYARAN */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-credit-card" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
                {editPayment ? 'Edit Metode Pembayaran' : 'Tambah Metode Pembayaran Baru'}
              </div>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSavePaymentMethod}>
              <div className="form-group">
                <label className="form-label" htmlFor="pm-label">
                  <i className="fa-solid fa-tag" style={{ marginRight: '6px' }}></i> Nama Metode Pembayaran <span className="required">*</span>
                </label>
                <input
                  id="pm-label"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Bank BRI, Wise Transfer, PayPal..."
                  value={paymentForm.label}
                  onChange={e => setPaymentForm(p => ({ ...p, label: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-icons" style={{ marginRight: '6px' }}></i> Pilih Ikon Font Awesome
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {FA_ICON_OPTIONS.map((item) => (
                    <button
                      key={item.icon}
                      type="button"
                      onClick={() => setPaymentForm(p => ({ ...p, icon: item.icon }))}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${paymentForm.icon === item.icon ? 'var(--brand-primary)' : 'var(--bg-border)'}`,
                        background: paymentForm.icon === item.icon ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-elevated)',
                        color: paymentForm.icon === item.icon ? 'var(--brand-primary-light)' : 'var(--text-secondary)',
                        fontSize: '16px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <i className={item.icon}></i>
                      <span style={{ fontSize: '10px' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-palette" style={{ marginRight: '6px' }}></i> Warna Aksentuasi Badge
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {COLOR_OPTIONS.map(c => (
                    <div
                      key={c.hex}
                      onClick={() => setPaymentForm(p => ({ ...p, color: c.hex }))}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: c.hex, cursor: 'pointer',
                        border: paymentForm.color === c.hex ? '3px solid #fff' : 'none',
                        boxShadow: paymentForm.color === c.hex ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreModalData && (
        <div className="modal-overlay" onClick={() => setRestoreModalData(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22C55E' }}>
                  <i className="fa-solid fa-cloud-arrow-up"></i> Confirm Restore Database Backup
                </div>
                <div className="modal-subtitle">
                  File: <strong>boss_rent_backup.json</strong> ({restoreModalData._displayDate || '-'})
                </div>
              </div>
              <button className="modal-close" onClick={() => setRestoreModalData(null)}>✕</button>
            </div>

            <div className="alert alert-warning" style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
              Proses restore ini akan meng-update/menggabungkan record dari file backup ke Supabase database dan meng-update pengaturan lokal.
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '16px', border: '1px solid var(--bg-border)', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: 'var(--brand-primary-light)' }}>
                Rincian Data Yang Akan Dipulihkan:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>🏍️ Armada Motor: <strong>{restoreModalData.data?.vehicles?.length || 0} unit</strong></div>
                <div>📄 Transaksi: <strong>{restoreModalData.data?.transactions?.length || 0} record</strong></div>
                <div>💸 Pengeluaran: <strong>{restoreModalData.data?.expenses?.length || 0} record</strong></div>
                <div>⚙️ Setting Operasional: <strong>Termasuk ✅</strong></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRestoreModalData(null)}>Batal</button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleExecuteRestore}
                disabled={restoringData}
                style={{ background: '#22C55E', borderColor: '#22C55E', color: '#fff', fontWeight: 700 }}
              >
                {restoringData ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Memulihkan Data...</>
                ) : (
                  <><i className="fa-solid fa-check-double" style={{ marginRight: '6px' }}></i> Ya, Pulihkan Data Sekarang</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH FOTO SHOWCASE GALERI WEB */}
      {showAddPhotoModal && (
        <div className="modal-overlay" onClick={() => setShowAddPhotoModal(false)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fa-solid fa-camera-retro" style={{ marginRight: '6px', color: 'var(--brand-primary-light)' }}></i>
                Tambah Foto Showcase Galeri Web Pelanggan
              </div>
              <button className="modal-close" onClick={() => setShowAddPhotoModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveNewPhotoModal}>
              <div className="form-group">
                <label className="form-label" htmlFor="photo-title">
                  <i className="fa-solid fa-heading" style={{ marginRight: '6px' }}></i> Judul Foto Showcase <span className="required">*</span>
                </label>
                <input
                  id="photo-title"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mint Green Vespa in Canggu Beach"
                  value={newPhotoForm.title}
                  onChange={e => setNewPhotoForm(p => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row cols-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="photo-tag">
                    <i className="fa-solid fa-tag" style={{ marginRight: '6px' }}></i> Kategori / Pill Badge Tag
                  </label>
                  <input
                    id="photo-tag"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Stylish Scooters, Free Delivery"
                    value={newPhotoForm.tag}
                    onChange={e => setNewPhotoForm(p => ({ ...p, tag: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="photo-icon">
                    <i className="fa-solid fa-icons" style={{ marginRight: '6px' }}></i> Ikon FontAwesome
                  </label>
                  <input
                    id="photo-icon"
                    type="text"
                    className="form-control"
                    placeholder="fa-solid fa-motorcycle"
                    value={newPhotoForm.icon}
                    onChange={e => setNewPhotoForm(p => ({ ...p, icon: e.target.value }))}
                  />
                </div>
              </div>

              {/* Direct File Picker Upload Button */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">
                  <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: '6px', color: 'var(--brand-primary)' }}></i> Upload File Foto Dari Perangkat (HP / Laptop)
                </label>
                <label className="btn btn-secondary btn-sm" style={{ width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--bg-elevated)', border: '1px dashed var(--brand-primary)' }}>
                  <i className="fa-solid fa-folder-open" style={{ color: 'var(--brand-primary)' }}></i>
                  <span>Pilih & Upload Foto Langsung Dari HP / Laptop</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleModalFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Quick Preset Selector */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fa-solid fa-images" style={{ marginRight: '6px' }}></i> Atau Pilih Dari Repositori Storage Opsi #5 ({bizForm.uploadedStoragePhotos?.length || 0} Foto Tersimpan)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '6px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--bg-border)' }}>
                  {((bizForm.uploadedStoragePhotos && bizForm.uploadedStoragePhotos.length > 0) ? bizForm.uploadedStoragePhotos : PHOTO_PRESETS).map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setNewPhotoForm(p => ({ ...p, url: preset.url, title: p.title || preset.label || preset.title }))}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: newPhotoForm.url === preset.url ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: 'var(--bg-card)'
                      }}
                    >
                      <img src={preset.url} alt={preset.label || preset.title} style={{ width: '100%', height: '48px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' }} />
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {preset.label || preset.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="photo-url">
                  <i className="fa-solid fa-link" style={{ marginRight: '6px' }}></i> URL / Path Foto / Preview Base64 <span className="required">*</span>
                </label>
                <input
                  id="photo-url"
                  type="text"
                  className="form-control"
                  placeholder="/images/boss_rent_bento_1.png atau data:image/png;base64..."
                  value={newPhotoForm.url}
                  onChange={e => setNewPhotoForm(p => ({ ...p, url: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddPhotoModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Simpan Foto Ke Galeri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
