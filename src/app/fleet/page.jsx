'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateFavicon } from '@/lib/favicon';
import { getLocalDateStr } from '@/lib/finance';
import '@/styles/sharp-system.css';
import StatCard from '@/components/fleet/StatCard';
import SectionHeading from '@/components/fleet/SectionHeading';
import SharpButton from '@/components/fleet/SharpButton';
import TrustSeal from '@/components/fleet/TrustSeal';
import ThemeToggle from '@/components/fleet/ThemeToggle';

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);
}

function formatEnDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ANIMATED COUNTER HOOK ───────────────────────────────────────────────────
function useCountUp(targetVal, durationMs = 1500, isDecimal = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const endVal = Number(targetVal) || 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * endVal;

      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [targetVal, durationMs]);

  if (isDecimal) {
    return count.toFixed(1);
  }
  return Math.floor(count);
}

export default function SharpSquareBusinessWebsitePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Date selection state for smart rate estimate
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bento gallery & fleet show more state (limit initial display to 6 cards)
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllFleet, setShowAllFleet] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const router = useRouter();


  // Light/dark theme — light is the default; dark is opt-in and
  // remembered. Starts 'light' on the server and first client render
  // (avoids hydration mismatch), then syncs from localStorage after mount.
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('boss_rent_fleet_theme');
      // Intentional: standard pattern for reading a client-only preference
      // (localStorage) without a server/client hydration mismatch — state
      // can't be initialized to the saved value directly since localStorage
      // isn't available during SSR or the first client render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'dark') setTheme('dark');
    } catch {
      // ignore
    }
  }, []);
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('boss_rent_fleet_theme', next); } catch { /* ignore */ }
      return next;
    });
  };

  // Business & CMS Landing Page State (Loads dynamically from admin panel settings)
  const [biz, setBiz] = useState({
  name: 'Demo Rental Preview',
  tagline: 'Sample Scooter Rental Platform • Live Preview Build',
  address: 'Sample Address, Bali, Indonesia',
  phone: '+62 812-3962-7764',
  phoneRaw: '0812-3962-7764',
  hours: 'Open Daily (Demo Data)',
  rating: 5.0,
  reviewsCount: 0,
  satisfactionPercent: 100,
  cleanScootersCount: 6,
  heroTitle: 'Vehicle Rental Platform — Live Demo',
  heroSubtitle: 'This is a preview build showcasing the booking flow, fleet catalog, and admin dashboard.',
  instagramUrl: '#',
  instagramHandle: '@demo',
  mapsUrl: '#',
  mapsEmbedUrl: ''
});

  // FAQ Accordion State (100% English for Tourists)
  const [openFaq, setOpenFaq] = useState(null);

  const [faqs, setFaqs] = useState([
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
  ]);

  // Animated counters from dynamic CMS state
  const animatedRating = useCountUp(biz.rating || 5.0, 1200, true);
  const animatedReviews = useCountUp(biz.reviewsCount || 24, 1500, false);
  const animatedSatisfaction = useCountUp(biz.satisfactionPercent || 100, 1600, false);
  const animatedFleet = useCountUp(biz.cleanScootersCount || 50, 1400, false);

  // 10 Extended Google Reviews representing the 24 Google Reviews
  const reviews = [
    {
      name: 'Singgih Dwi Purnomo',
      badge: 'Local Guide • Google Review',
      rating: 5,
      comment: 'Pelayanan sangat puas good 🙏🏼',
      date: 'Google Review'
    },
    {
      name: 'Made Budiana',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Orangnya sabar dan servis memuaskan',
      date: 'Google Review'
    },
    {
      name: 'Alexandre Mercier',
      badge: 'Tourist from France',
      rating: 5,
      comment: 'Best scooter rental in Pererenan! Clean NMax, fresh sanitized helmets delivered to our villa in 15 mins.',
      date: 'Verified Renter'
    },
    {
      name: 'Liam & Emma',
      badge: 'Tourists from Australia',
      rating: 5,
      comment: 'Super friendly owner, honest rates with no hidden fees. Scooter ran perfectly for our 2-week trip in Canggu!',
      date: 'Verified Renter'
    },
    {
      name: 'Dmitry V.',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Great service, fast response on WhatsApp 0812-3710-9751. Flexible daily and weekly prices!',
      date: 'Google Review'
    },
    {
      name: 'Siti Rahmawati',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Motornya mulus banget, helm bersih wangi, masnya ramah banget pas serah terima motor di Pererenan.',
      date: 'Google Review'
    },
    {
      name: 'Jonas Berg',
      badge: 'Tourist from Sweden',
      rating: 5,
      comment: 'Highly recommended rental shop! Clean bikes, free delivery, and deposit process was super easy.',
      date: 'Verified Renter'
    },
    {
      name: 'Charlotte H.',
      badge: 'Tourist from UK',
      rating: 5,
      comment: 'Very professional scooter rental! We rented two Scoopy bikes for 10 days. Perfect condition!',
      date: 'Verified Renter'
    },
    {
      name: 'Budi Santoso',
      badge: 'Google Reviewer',
      rating: 5,
      comment: 'Pelayanan mantap, respon WA cepat, harga sangat terjangkau dibanding rental sekitar Canggu.',
      date: 'Google Review'
    },
    {
      name: 'Michael Tan',
      badge: 'Tourist from Singapore',
      rating: 5,
      comment: 'Excellent experience! Bike was delivered clean with full tank option. Best price in Pererenan area.',
      date: 'Verified Renter'
    }
  ];

  // Bento showcase grid photos (Loads dynamically from admin panel CMS if present)
  const bentoPhotos = Array.isArray(biz.galleryPhotos) && biz.galleryPhotos.length > 0 ? biz.galleryPhotos : [
    {
      url: '/images/boss_rent_customer_bali.png',
      title: 'Scooter Rental in Pererenan',
      tag: 'Premium Fleet',
      icon: 'fa-solid fa-star',
      span: 'wide'
    },
    {
      url: '/images/boss_rent_bento_1.png',
      title: 'Mint Green Vespa Fleet',
      tag: 'Stylish Scooters',
      icon: 'fa-solid fa-motorcycle',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_fleet_lineup.png',
      title: 'Clean & Regularly Serviced Fleet',
      tag: '100% Maintained',
      icon: 'fa-solid fa-wrench',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_2.png',
      title: 'Pererenan Beach Exploring',
      tag: 'Canggu Area',
      icon: 'fa-solid fa-umbrella-beach',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_3.png',
      title: 'Easy Key Handover Service',
      tag: 'Express Pickup',
      icon: 'fa-solid fa-key',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_5.png',
      title: 'Scenic Countryside Cruising',
      tag: 'Bali Road Trips',
      icon: 'fa-solid fa-route',
      span: 'wide'
    },
    {
      url: '/images/boss_rent_bento_6.png',
      title: 'Sanitized Clean Helmets',
      tag: 'Safety Standard',
      icon: 'fa-solid fa-shield-halved',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_bento_8.png',
      title: 'Red Honda Scoopy Lineup',
      tag: 'Sunset Touring',
      icon: 'fa-solid fa-sun',
      span: 'normal'
    },
    {
      url: '/images/boss_rent_helmet_handover.png',
      title: 'Free Villa Delivery & Pickup',
      tag: 'Free Delivery',
      icon: 'fa-solid fa-truck-fast',
      span: 'wide'
    }
  ];

  useEffect(() => {
    // Defer ke microtask: hindari setState sinkron di dalam effect
    Promise.resolve().then(() => {
    // Default dates: Today to 3 days later (tanggal LOKAL/WITA, bukan UTC)
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    setStartDate(getLocalDateStr(today));
    setEndDate(getLocalDateStr(threeDaysLater));

    // Load admin business settings & CMS landing page data from localStorage if available
    try {
      const savedBiz = localStorage.getItem('boss_rent_biz_settings');
      if (savedBiz) {
        const parsed = JSON.parse(savedBiz);
        if (parsed.logoUrl) {
          updateFavicon(parsed.logoUrl);
        }
        setBiz(prev => ({
          ...prev,
          name: parsed.name || prev.name,
          logoUrl: parsed.logoUrl || prev.logoUrl || '/images/logoCompany.png',
          phone: parsed.phone || prev.phone,
          phoneRaw: parsed.phone || prev.phoneRaw,
          address: parsed.address || prev.address,
          tagline: parsed.tagline || prev.tagline,
          heroTitle: parsed.heroTitle || prev.heroTitle,
          heroSubtitle: parsed.heroSubtitle || prev.heroSubtitle,
          rating: parsed.rating ? parseFloat(parsed.rating) : prev.rating,
          reviewsCount: parsed.reviewsCount ? parseInt(parsed.reviewsCount) : prev.reviewsCount,
          satisfactionPercent: parsed.satisfactionPercent ? parseInt(parsed.satisfactionPercent) : prev.satisfactionPercent,
          cleanScootersCount: parsed.cleanScootersCount ? parseInt(parsed.cleanScootersCount) : prev.cleanScootersCount,
          instagramUrl: parsed.instagramUrl || prev.instagramUrl,
          instagramHandle: parsed.instagramHandle || prev.instagramHandle,
          galleryPhotos: Array.isArray(parsed.galleryPhotos) && parsed.galleryPhotos.length > 0 ? parsed.galleryPhotos : prev.galleryPhotos
        }));

        if (Array.isArray(parsed.faqs) && parsed.faqs.length > 0) {
          setFaqs(parsed.faqs);
        }
      }
    } catch {
      // ignore
    }

    async function fetchVehicles() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          setVehicles(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchVehicles();
    }); // end Promise.resolve().then
  }, []);

  const calculateEstimate = (vehicle) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null;

    const durationDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const dailyRate = Number(vehicle.rate_per_day) || 0;
    const weeklyRate = Number(vehicle.rate_per_week) || 0;
    const monthlyRate = Number(vehicle.rate_per_month) || 0;

    const dailyTotal = durationDays * dailyRate;
    let bestGross = dailyTotal;
    let tierUsed = 'Daily Rate';

    if (weeklyRate > 0) {
      const mixCost = (Math.floor(durationDays / 7) * weeklyRate) + ((durationDays % 7) * dailyRate);
      const flatCost = Math.ceil(durationDays / 7) * weeklyRate;
      const bestWeekly = Math.min(mixCost, flatCost);
      if (bestWeekly < bestGross) { bestGross = bestWeekly; tierUsed = 'Weekly Package'; }
    }

    if (monthlyRate > 0) {
      const months = Math.floor(durationDays / 30);
      const remDays = durationDays % 30;
      const mixCost = (months * monthlyRate) + (Math.floor(remDays / 7) * (weeklyRate || dailyRate * 7)) + ((remDays % 7) * dailyRate);
      const flatCost = Math.max(1, Math.ceil(durationDays / 30)) * monthlyRate;
      const bestMonthly = Math.min(mixCost, flatCost);
      if (bestMonthly < bestGross) { bestGross = bestMonthly; tierUsed = 'Monthly Package'; }
    }

    return {
      durationDays,
      total: bestGross,
      savings: dailyTotal - bestGross,
      tierUsed
    };
  };

  const handleBookVehicle = (vehicle) => {
    const params = new URLSearchParams({
      vehicleId: vehicle.id || '',
      start: startDate || '',
      end: endDate || '',
    });
    router.push(`/booking?${params.toString()}`);
  };

  const handleImgError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = '/images/boss_rent_fleet_lineup.png';
  };

  // Dynamic categories automatically extracted from vehicles
  const dynamicCategories = ['all'];
  vehicles.forEach(v => {
    if (v.category) {
      const cat = String(v.category).trim().toLowerCase();
      if (cat && !dynamicCategories.includes(cat)) {
        dynamicCategories.push(cat);
      }
    }
  });

  const filtered = vehicles.filter(v => {
    const matchesCat = selectedCategory === 'all' || (v.category && v.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase()) || (v.plate_number && v.plate_number.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className={`sharp-page ${theme === 'dark' ? 'sharp-page--dark' : ''}`}>
      {/* ── TOP ANNOUNCEMENT BAR — permanently dark, like the footer, regardless of page theme ── */}
      <div style={{ background: '#0B0F19', color: '#F1F5F9', textAlign: 'center', padding: '9px 16px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.2px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-motorcycle" style={{ color: '#FBBF24' }}></i>
          {biz.tagline}
        </span>
        <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E8C179', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <i className="fa-solid fa-star" style={{ color: '#E8C179' }}></i>
          {animatedRating} Google Rating ({animatedReviews} Reviews)
        </a>
      </div>

      {/* ── STICKY NAVBAR HEADER (Sharp Square Flat Header) ── */}
      <header style={{ background: 'var(--sharp-surface)', borderBottom: '1px solid var(--sharp-line)', position: 'sticky', top: 0, zIndex: 100, padding: '16px 28px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={biz.logoUrl || "/images/logoCompany.png"}
              alt="DEMO RENTAL PREVIEW Logo"
              style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: '21px', fontWeight: 900, color: 'var(--sharp-ink)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.5px' }}>
                {biz.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--sharp-muted)', marginTop: '2px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-location-dot" style={{ color: 'var(--sharp-accent)' }}></i>
                {biz.address}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <SharpButton
              href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="accent"
              size="sm"
              icon="fa-brands fa-whatsapp"
              className="fleet-header-cta"
            >
              Book Now
            </SharpButton>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* ── HERO BANNER & ANIMATED COUNTERS SECTION (Sharp Square Layout) ── */}
      <section style={{ background: 'var(--sharp-surface)', borderBottom: '1px solid var(--sharp-line)', padding: '64px 24px' }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: '56px',
          alignItems: 'center',
        }}>
          {/* ── LEFT: headline, trust, CTA ── */}
          <div>
            <div className="google-verified-badge">
              <span className="star-rating-chip">
                <i className="fa-solid fa-star"></i>
                <span>{animatedRating}</span>
              </span>
              <span className="badge-bullet">•</span>
              <span>Google Verified Business ({animatedReviews} Google Reviews)</span>
            </div>

            <h1 className="font-display" style={{ fontSize: '44px', fontWeight: 600, margin: '18px 0 16px 0', color: 'var(--sharp-ink)', lineHeight: 1.12, letterSpacing: '-0.5px' }}>
              Clean &amp; reliable scooters,<br />ridden with an easy mind.
            </h1>

            <p style={{ fontSize: '16px', color: 'var(--sharp-ink-soft)', lineHeight: 1.65, marginBottom: '24px', maxWidth: '460px', fontWeight: 400 }}>
              Explore Pererenan &amp; Canggu with confidence — clean helmets, villa delivery, transparent daily &amp; weekly rates, and 24/7 WhatsApp support if anything comes up.
            </p>

            <div style={{ marginBottom: '28px' }}>
              <TrustSeal rating={animatedRating} />
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <SharpButton
                href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="accent"
                size="lg"
                icon="fa-brands fa-whatsapp"
              >
                Rent Now
              </SharpButton>
              <SharpButton
                href="#fleet-grid"
                variant="outline"
                size="lg"
              >
                See Fleet
              </SharpButton>
            </div>
          </div>

          {/* ── RIGHT: real photo, softly rounded ── */}
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              aspectRatio: '4 / 4.6',
              position: 'relative',
            }}>
              <img
                src="/images/boss_rent_customer_bali.png"
                alt="Happy customers riding a Demo Rental Preview scooter through Pererenan, Bali"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="sharp-card" style={{
              position: 'absolute',
              left: '16px',
              bottom: '24px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-full)', background: 'var(--status-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-shield-heart" style={{ color: 'var(--status-success)', fontSize: '16px' }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--sharp-ink)' }}>Deposit protected</div>
                <div style={{ fontSize: '11.5px', color: 'var(--sharp-muted)' }}>Clear terms, no surprises</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — 3-STEP BOOKING FLOW ── */}
      <section style={{ padding: '64px 24px', background: 'var(--sharp-surface-2)', borderTop: '1px solid var(--sharp-line)', borderBottom: '1px solid var(--sharp-line)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <SectionHeading
            eyebrow="How It Works"
            title="Booking In 3 Simple Steps"
            icon="fa-solid fa-route"
            style={{ marginBottom: '40px' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { icon: 'fa-solid fa-calendar-check', title: 'Pick Your Dates', desc: 'Select pickup and return dates — daily, weekly, and monthly rates auto-calculated.' },
              { icon: 'fa-solid fa-motorcycle', title: 'Choose Your Scooter', desc: 'Browse available scooters for your dates and pick the model that fits your trip.' },
              { icon: 'fa-brands fa-whatsapp', title: 'Book Via WhatsApp', desc: 'Confirm instantly over WhatsApp. Pay on pickup, no deposit surprises.' },
            ].map((step, idx) => (
              <div key={idx} className="sharp-card" style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: 'var(--radius-full)',
                  background: 'var(--sharp-surface)', border: '1px solid var(--sharp-line-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 18px auto', fontSize: '24px', color: 'var(--sharp-accent)',
                }}>
                  <i className={step.icon}></i>
                </div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sharp-accent)', marginBottom: '6px' }}>STEP {idx + 1}</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--sharp-ink)', marginBottom: '8px' }}>{step.title}</div>
                <div style={{ fontSize: '13.5px', color: 'var(--sharp-muted)', lineHeight: 1.6 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCHEDULE YOUR RENTAL DATES ── */}
      <section style={{ padding: '48px 24px', background: 'var(--sharp-surface)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto 28px auto', textAlign: 'center' }}>
          <SectionHeading
            eyebrow="Schedule Your Rental"
            title="Pick Your Dates"
            icon="fa-solid fa-calendar-days"
          />
        </div>
        <div className="sharp-card hero-search-bar" style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '22px 28px',
          boxShadow: 'var(--sharp-shadow-lg)',
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px', textAlign: 'left', letterSpacing: '0.4px' }}>
              <i className="fa-solid fa-location-dot" style={{ marginRight: '4px', color: 'var(--sharp-accent)' }}></i> Where To Pick Up
            </label>
            <div className="sharp-input" style={{ color: 'var(--sharp-ink-soft)' }}>Pererenan, Canggu</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px', textAlign: 'left', letterSpacing: '0.4px' }}>
              Pickup Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="sharp-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--sharp-muted)', marginBottom: '6px', textAlign: 'left', letterSpacing: '0.4px' }}>
              Return Date
            </label>
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="sharp-input"
            />
          </div>
          <SharpButton href="#fleet-grid" variant="accent" size="md" icon="fa-solid fa-magnifying-glass">
            Search
          </SharpButton>
        </div>

      </section>

      <main id="fleet-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 24px 60px 24px', scrollMarginTop: '90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--sharp-ink)', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>Available Fleet & Smart Pricing</span>
              <i className="fa-solid fa-motorcycle" style={{ color: 'var(--sharp-accent)' }}></i>
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--sharp-muted)', marginTop: '4px' }}>
              Daily, Weekly, & Monthly rate tiers automatically calculated for best savings.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {dynamicCategories.map(catId => {
              const label = catId === 'all'
                ? 'All Scooters'
                : catId.charAt(0).toUpperCase() + catId.slice(1);

              return (
                <SharpButton
                  key={catId}
                  size="sm"
                  variant={selectedCategory === catId ? 'accent' : 'outline'}
                  onClick={() => { setSelectedCategory(catId); setShowAllFleet(false); }}
                  style={{ textTransform: 'capitalize' }}
                >
                  {label}
                </SharpButton>
              );
            })}

            <input
              type="text"
              placeholder="Search model..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sharp-input"
              style={{ width: '180px' }}
            />
          </div>
        </div>

        {/* Loading / Cards Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sharp-muted)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: 'var(--sharp-accent)' }}></i>
            <div style={{ marginTop: '12px', fontSize: '14px' }}>Loading Available Scooters...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sharp-card" style={{ textAlign: 'center', padding: '60px 0' }}>
            <i className="fa-solid fa-motorcycle" style={{ fontSize: '40px', color: 'var(--sharp-muted)', marginBottom: '12px' }}></i>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--sharp-ink)' }}>No Scooters Available In This Category</div>
            <div style={{ fontSize: '12px', color: 'var(--sharp-muted)', marginTop: '4px' }}>Please select another brand category or clear search.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {(showAllFleet ? filtered : filtered.slice(0, 6)).map(vehicle => {
              const estimate = calculateEstimate(vehicle);
              const isAvailable = vehicle.status === 'available';
              const statusMeta = {
                available:   { label: 'Available Now', icon: 'fa-solid fa-circle-check', bg: 'var(--sharp-success-bg)' },
                booked:      { label: 'Booked',        icon: 'fa-solid fa-clock',         bg: '#F59E0B' },
                rented:      { label: 'Rented',        icon: 'fa-solid fa-key',           bg: 'var(--sharp-info)' },
                maintenance: { label: 'In Service',    icon: 'fa-solid fa-wrench',        bg: '#EF4444' },
              }[vehicle.status] || { label: 'Rented', icon: 'fa-solid fa-key', bg: 'var(--sharp-info)' };

              return (
                <div key={vehicle.id} className="sharp-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Image */}
                  <div style={{ height: '180px', width: '100%', background: 'var(--sharp-surface-2)', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--sharp-line)' }}>
                    {vehicle.image_url ? (
                      <img src={vehicle.image_url} alt={vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={handleImgError} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sharp-muted)', fontSize: '48px' }}>
                        <i className="fa-solid fa-motorcycle"></i>
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '4px 12px',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        background: statusMeta.bg,
                        color: '#FFF',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>{statusMeta.label}</span>
                      <i className={statusMeta.icon}></i>
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'var(--sharp-accent)', fontWeight: 900, textTransform: 'uppercase' }}>
                      {vehicle.category ? vehicle.category.toUpperCase() : 'SCOOTER'} • {vehicle.year}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--sharp-ink)', margin: '2px 0 10px 0' }}>
                      {vehicle.name}
                    </div>

                    {/* Spec row — real vehicle data, not placeholders */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', marginBottom: '14px', fontSize: '12px', color: 'var(--sharp-ink-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <i className="fa-solid fa-gears" style={{ color: 'var(--sharp-muted)', width: '14px' }}></i>
                        {vehicle.category === 'vespa' ? 'Automatic' : 'Matic'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <i className="fa-solid fa-helmet-safety" style={{ color: 'var(--sharp-muted)', width: '14px' }}></i>
                        2 Helmets
                      </div>
                      {vehicle.color && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <i className="fa-solid fa-palette" style={{ color: 'var(--sharp-muted)', width: '14px' }}></i>
                          {vehicle.color}
                        </div>
                      )}
                      {vehicle.plate_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <i className="fa-solid fa-id-card" style={{ color: 'var(--sharp-muted)', width: '14px' }}></i>
                          {vehicle.plate_number}
                        </div>
                      )}
                    </div>

                    {/* Rate Tiers */}
                    <div style={{ background: 'var(--sharp-bg)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '14px', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <span style={{ color: 'var(--sharp-muted)' }}>Daily:</span>
                        <div style={{ fontWeight: 800, color: 'var(--sharp-ink)' }}>{formatRupiah(vehicle.rate_per_day)}</div>
                      </div>
                      {vehicle.rate_per_week > 0 && (
                        <div>
                          <span style={{ color: 'var(--sharp-muted)' }}>Weekly:</span>
                          <div style={{ fontWeight: 800, color: 'var(--sharp-success)' }}>{formatRupiah(vehicle.rate_per_week)}</div>
                        </div>
                      )}
                      {vehicle.rate_per_month > 0 && (
                        <div>
                          <span style={{ color: 'var(--sharp-muted)' }}>Monthly:</span>
                          <div style={{ fontWeight: 800, color: 'var(--sharp-info)' }}>{formatRupiah(vehicle.rate_per_month)}</div>
                        </div>
                      )}
                    </div>

                    {/* Smart Calculation Estimate */}
                    {estimate && (
                      <div style={{ background: 'rgba(184, 112, 63, 0.07)', border: '1px solid rgba(184, 112, 63, 0.25)', borderRadius: 'var(--radius-md)', padding: '10px 12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--sharp-accent)', fontWeight: 900 }}>
                            <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '4px' }}></i> Estimated ({estimate.durationDays} Days):
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--sharp-ink)' }}>{formatRupiah(estimate.total)}</span>
                        </div>
                        {estimate.savings > 0 && (
                          <div style={{ fontSize: '10.5px', color: 'var(--sharp-success)', fontWeight: 800, marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-tag"></i> Saves {formatRupiah(estimate.savings)} via {estimate.tierUsed}!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Booking Button */}
                    <SharpButton
                      variant={isAvailable ? 'whatsapp' : 'dark'}
                      block
                      disabled={!isAvailable}
                      onClick={() => isAvailable && handleBookVehicle(vehicle)}
                      icon={isAvailable ? 'fa-brands fa-whatsapp' : statusMeta.icon}
                      style={{ marginTop: 'auto', opacity: isAvailable ? 1 : 0.6, cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                    >
                      {isAvailable ? 'Book Now' : statusMeta.label}
                    </SharpButton>
                  </div>
                </div>
              );
            })}
          </div>

            {/* SEE MORE FLEET BUTTON (Triggers when filtered fleet > 6) */}
            {filtered.length > 6 && (
              <div style={{ textAlign: 'center', marginTop: '36px' }}>
                <SharpButton
                  variant="dark"
                  size="lg"
                  onClick={() => setShowAllFleet(!showAllFleet)}
                  iconTrailing={`fa-solid ${showAllFleet ? 'fa-chevron-up' : 'fa-chevron-down'}`}
                >
                  {showAllFleet ? 'Show Less Scooters' : `See More Fleet (${filtered.length - 6} More Scooters)`}
                </SharpButton>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── BRANDS WE CARRY — looping trust strip ── */}
      <section style={{ padding: '28px 0', background: 'var(--sharp-surface)', borderBottom: '1px solid var(--sharp-line)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sharp-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Brands We Carry
          </span>
        </div>

        <div style={{ position: 'absolute', left: 0, top: '32px', bottom: 0, width: '80px', background: 'linear-gradient(to right, var(--sharp-surface), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', right: 0, top: '32px', bottom: 0, width: '80px', background: 'linear-gradient(to left, var(--sharp-surface), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>

        <div className="marquee-track" style={{ alignItems: 'center' }}>
          {[...Array(2)].flatMap(() => [
            { name: 'Honda', available: true },
            { name: 'Yamaha', available: true },
            { name: 'Suzuki', available: false },
            { name: 'Kawasaki', available: false },
            { name: 'Vespa', available: false },
          ]).map((brand, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 32px', flexShrink: 0 }}>
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--sharp-ink-soft)', letterSpacing: '-0.3px', opacity: brand.available ? 0.85 : 0.4, whiteSpace: 'nowrap' }}>
                {brand.name}
              </span>
              {!brand.available && (
                <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--sharp-muted)', background: 'var(--sharp-surface-2)', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-full)', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── STAT ROW ── */}
      <section style={{ padding: '48px 24px 0 24px', background: 'var(--sharp-surface)' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <StatCard value={animatedRating} valueColor="var(--sharp-accent)" icon="fa-solid fa-star" iconColor="var(--sharp-star)" label="Google Rating" sublabel="5-Star Verified Score" />
          <StatCard value={animatedReviews} valueColor="var(--sharp-success)" label="Google Reviews" sublabel="Real Happy Customers" />
          <StatCard value={`${animatedSatisfaction}%`} valueColor="var(--sharp-info)" label="Customer Satisfaction" sublabel="Best Service Guarantee" />
          <StatCard value={`${animatedFleet}+`} valueColor="var(--sharp-warning)" label="Clean Scooters" sublabel="Regularly Serviced" />
        </div>
      </section>

      {/* ── SHARP BENTO GRID CUSTOMER SHOWCASE GALLERY ── */}
      <section style={{ padding: '52px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <SectionHeading
          eyebrow="Explore Our Fleet & Service"
          title="Premium Scooter Fleet & Service Gallery"
          icon="fa-solid fa-images"
          subtitle="Explore our clean scooters, equipment standards, and professional rental service in Pererenan & Canggu, Bali"
        />

        {/* CLEAN 6-CARD RESPONSIVE GRID MATRIX (Perfect 3x2 Grid on Desktop) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          {(showAllPhotos ? bentoPhotos : bentoPhotos.slice(0, 6)).map((photo, idx) => (
            <div
              key={idx}
              className="bento-card-sharp"
              style={{
                height: '240px',
                width: '100%',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              <img src={photo.url} alt={photo.title} className="bento-img" onError={handleImgError} />
              <div className="bento-overlay" style={{ boxSizing: 'border-box', padding: '16px', width: '100%' }}>
                <span style={{ fontSize: '10px', background: 'var(--sharp-ink)', color: 'var(--sharp-bg)', padding: '4px 10px', fontWeight: 800, width: 'fit-content', marginBottom: '6px', borderRadius: 'var(--radius-sm)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={photo.icon} style={{ color: 'var(--sharp-accent)', fontSize: '11px' }}></i>
                  <span>{photo.tag}</span>
                </span>
                <div style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.2, wordBreak: 'break-word' }}>{photo.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SEE MORE / SHOW LESS BUTTON (Show More triggers when > 6 photos) */}
        {bentoPhotos.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <SharpButton
              variant="dark"
              onClick={() => setShowAllPhotos(!showAllPhotos)}
              iconTrailing={`fa-solid ${showAllPhotos ? 'fa-chevron-up' : 'fa-chevron-down'}`}
            >
              {showAllPhotos ? 'Show Less Photos' : `See More Photos (${bentoPhotos.length - 6} More)`}
            </SharpButton>
          </div>
        )}
      </section>

      {/* ── SHARP SCOOTER CATALOG GRID ── */}

      {/* ── FEATURED TESTIMONIAL — large single review with photo ── */}
      <section style={{ padding: '64px 24px', background: 'var(--sharp-surface-2)', borderTop: '1px solid var(--sharp-line)', borderBottom: '1px solid var(--sharp-line)' }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
          gap: '48px', alignItems: 'center',
        }}>
          <div>
            <div className="sharp-eyebrow">What Riders Say</div>
            <h2 className="font-display" style={{ fontSize: '30px', fontWeight: 600, color: 'var(--sharp-ink)', margin: '6px 0 20px 0' }}>
              Real Reviews From Real Riders
            </h2>
            <div style={{ color: 'var(--sharp-star)', fontSize: '16px', display: 'flex', gap: '3px', marginBottom: '16px' }}>
              {[...Array(reviews[activeTestimonial]?.rating || 5)].map((_, i) => (
                <i key={i} className="fa-solid fa-star"></i>
              ))}
            </div>
            <p style={{ fontSize: '19px', color: 'var(--sharp-ink)', lineHeight: 1.55, fontWeight: 500, marginBottom: '24px', minHeight: '84px' }}>
              &quot;{reviews[activeTestimonial]?.comment}&quot;
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--sharp-ink)' }}>{reviews[activeTestimonial]?.name}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--sharp-muted)' }}>{reviews[activeTestimonial]?.badge}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveTestimonial(prev => (prev - 1 + reviews.length) % reviews.length)}
                  className="icon-btn-round"
                  aria-label="Previous review"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTestimonial(prev => (prev + 1) % reviews.length)}
                  className="icon-btn-round"
                  aria-label="Next review"
                >
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--sharp-shadow-lg)', aspectRatio: '4/3.4' }}>
            <img
              src="/images/boss_rent_customer_bali.png"
              alt="Happy Demo Rental Preview customers in Bali"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* ── GOOGLE REVIEWS SECTION (Infinite Scroll Carousel Marquee) ── */}
      <section id="reviews" style={{ background: 'var(--sharp-surface)', borderTop: '1px solid var(--sharp-line)', borderBottom: '1px solid var(--sharp-line)', padding: '54px 0', overflow: 'hidden', position: 'relative', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', marginBottom: '32px' }}>
          <SectionHeading
            eyebrow="Real Google Maps Reviews"
            title="Google Reviews & Ratings"
            icon="fa-solid fa-star"
            subtitle={`5.0 Rating based on ${biz.reviewsCount} Google Maps reviews for Demo Rental Preview (Hover to pause)`}
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* ── INFINITE MARQUEE CAROUSEL ── */}
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(to right, var(--sharp-bg), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(to left, var(--sharp-bg), transparent)', zIndex: 2, pointerEvents: 'none' }}></div>

          <div className="marquee-track">
            {[...reviews, ...reviews].map((rev, i) => (
              <div
                key={i}
                className="sharp-card"
                style={{
                  padding: '20px',
                  width: '320px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--sharp-star)', fontSize: '13px', display: 'flex', gap: '2px' }}>
                    {[...Array(rev.rating)].map((_, sIdx) => (
                      <i key={sIdx} className="fa-solid fa-star"></i>
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--sharp-ink)', background: 'var(--sharp-surface-2)', border: '1px solid var(--sharp-line)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontWeight: 700 }}>
                    {rev.badge}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--sharp-ink-soft)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                  &quot;{rev.comment}&quot;
                </p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--sharp-line)', paddingTop: '10px', fontWeight: 900, fontSize: '12px', color: 'var(--sharp-ink)' }}>
                  {rev.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <SharpButton
            href={biz.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            icon="fa-brands fa-google"
          >
            View All 24 Reviews on Google Maps
          </SharpButton>
        </div>
      </section>

      {/* ── FAQ SECTION (FREQUENTLY ASKED QUESTIONS) ── */}
      <section id="faq" style={{ padding: '56px 24px', background: 'var(--sharp-surface)', borderTop: '1px solid var(--sharp-line)', borderBottom: '1px solid var(--sharp-line)', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Frequently Asked Questions"
            title="Frequently Asked Questions (FAQ)"
            icon="fa-solid fa-circle-question"
            subtitle="Everything you need to know about rental requirements, amenities, delivery services, and security deposit policies"
            style={{ marginBottom: '36px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="sharp-card"
                  style={{
                    overflow: 'hidden',
                    borderColor: isOpen ? 'var(--sharp-accent-solid)' : 'var(--sharp-line)',
                    boxShadow: isOpen ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 20px',
                      background: 'transparent',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 800,
                      fontSize: '15px',
                      color: 'var(--sharp-ink)'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: 'var(--radius-sm)',
                        background: isOpen ? 'var(--sharp-accent-solid)' : 'var(--sharp-ink)',
                        color: isOpen ? '#FFFFFF' : 'var(--sharp-bg)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}>
                        Q{idx + 1}
                      </span>
                      {faq.q}
                    </span>
                    <i className={`fa-solid ${isOpen ? 'fa-minus' : 'fa-plus'}`} style={{ color: isOpen ? 'var(--sharp-accent)' : 'var(--sharp-ink)', fontSize: '14px' }}></i>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 20px 20px 56px', fontSize: '14px', color: 'var(--sharp-ink-soft)', lineHeight: 1.6, borderTop: '1px dashed #CBD5E1', paddingTop: '14px' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── EMBEDDED INTERACTIVE LIVE GOOGLE MAPS SECTION ("Find Demo Rental Preview") ── */}
      <section id="location" style={{ padding: '56px 24px', background: 'var(--sharp-surface)', scrollMarginTop: '90px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <SectionHeading
            eyebrow="Interactive Google Maps Location"
            title="Find Demo Rental Preview"
            icon="fa-solid fa-location-dot"
            subtitle={biz.address}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', alignItems: 'start' }}>
            {/* Business Contact Info */}
            <div className="sharp-card" style={{ padding: '28px' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--sharp-ink)', marginBottom: '16px' }}>
                Store Information
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '13.5px', color: 'var(--sharp-ink-soft)', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--sharp-ink)', color: 'var(--sharp-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-location-dot" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--sharp-ink)' }}>Address:</strong><br />
                    {biz.address}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--sharp-success-bg)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-phone" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--sharp-ink)' }}>Phone / WhatsApp:</strong><br />
                    <a href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`} style={{ color: 'var(--sharp-whatsapp)', fontWeight: 800 }}>
                      {biz.phoneRaw} ({biz.phone})
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--sharp-info)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
                    <i className="fa-solid fa-clock" style={{ fontSize: '16px' }}></i>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--sharp-ink)' }}>Operating Hours:</strong><br />
                    {biz.hours}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <SharpButton
                  href={biz.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="accent"
                  icon="fa-solid fa-route"
                >
                  Open Directions on Google Maps
                </SharpButton>
              </div>
            </div>

            {/* Embedded Live Google Maps Iframe */}
            <div className="sharp-card" style={{ overflow: 'hidden' }}>
              <iframe
                title="Demo Rental Preview Google Map"
                src={biz.mapsEmbedUrl}
                width="100%"
                height="380"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* ── FLOATING ACTION BUTTONS STACK (INSTAGRAM & WHATSAPP) ── */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 9999 }}>
        <a
          href={biz.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="sharp-fab"
          style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)' }}
          title="Follow Demo Rental Preview on Instagram"
        >
          <i className="fa-brands fa-instagram"></i>
        </a>

        <a
          href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sharp-fab"
          style={{ background: 'var(--sharp-whatsapp)', fontSize: '28px' }}
          title="Chat with Demo Rental Preview on WhatsApp"
        >
          <i className="fa-brands fa-whatsapp"></i>
        </a>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0B0F19', padding: '56px 24px 0 24px', color: '#94A3B8' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '36px', paddingBottom: '40px' }}>
            {/* Brand column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <img src={biz.logoUrl || "/images/logoCompany.png"} alt={biz.name} style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#F1F5F9' }}>{biz.name}</span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
                Clean, reliable scooter rental in Pererenan &amp; Canggu, Bali — daily, weekly, and monthly rates with villa delivery.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href={biz.instagramUrl} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F1F5F9', fontSize: '15px' }}>
                  <i className="fa-brands fa-instagram"></i>
                </a>
                <a href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F1F5F9', fontSize: '15px' }}>
                  <i className="fa-brands fa-whatsapp"></i>
                </a>
                <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F1F5F9', fontSize: '15px' }} title="Find us on Google Maps">
                  <i className="fa-solid fa-location-dot"></i>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '13.5px' }}>
                <a href="#fleet-grid" style={{ color: '#94A3B8', textDecoration: 'none' }}>Fleet &amp; Pricing</a>
                <a href="#faq" style={{ color: '#94A3B8', textDecoration: 'none' }}>FAQ</a>
                <a href="#reviews" style={{ color: '#94A3B8', textDecoration: 'none' }}>Reviews</a>
                <a href="#location" style={{ color: '#94A3B8', textDecoration: 'none' }}>Location</a>
              </div>
            </div>

            {/* Support */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', fontSize: '13.5px' }}>
                <a href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>WhatsApp Us</a>
                <a href={biz.mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8', textDecoration: 'none' }}>Get Directions</a>
                <span>{biz.hours}</span>
                <span>{biz.phone}</span>
              </div>
            </div>

            {/* Address */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#F1F5F9', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visit Us</div>
              <div style={{ fontSize: '13.5px', lineHeight: 1.7 }}>{biz.address}</div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '20px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
          }}>
            <div>© {new Date().getFullYear()} <strong style={{ color: '#F1F5F9' }}>{biz.name}</strong>. All rights reserved.</div>
            <div>Premium Scooter Rental — Pererenan, Canggu, Bali</div>
          </div>
        </div>
      </footer>

    </div>
  );
}
