'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginAs, setLoginAs] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, loginAs }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Email atau password salah. Silakan coba lagi.');
      } else {
        router.push(data.role === 'driver' ? '/transactions' : '/dashboard');
        router.refresh();
      }
    } catch {
      setError('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    }

    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <i className="fa-solid fa-motorcycle"></i>
          </div>
          <h1>Demo Rental Preview</h1>
          <p>Masuk ke panel kerja</p>
        </div>

        {/* Role selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { key: 'admin', label: 'Admin', icon: 'fa-solid fa-user-shield' },
            { key: 'driver', label: 'Driver', icon: 'fa-solid fa-motorcycle' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setLoginAs(opt.key); setError(''); }}
              style={{
                padding: '12px', borderRadius: 'var(--radius-md, 10px)', cursor: 'pointer',
                border: loginAs === opt.key ? '2px solid var(--brand-primary)' : '1px solid var(--bg-border)',
                background: loginAs === opt.key ? 'var(--brand-primary-bg, rgba(59,130,246,0.1))' : 'transparent',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}
            >
              <i className={opt.icon} style={{ fontSize: '18px', color: loginAs === opt.key ? 'var(--brand-primary)' : 'var(--text-muted)' }}></i>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder={loginAs === 'driver' ? 'driver@preview.com' : 'admin@preview.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading}
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Masuk...</>
            ) : (
              <><i className="fa-solid fa-right-to-bracket" style={{ marginRight: '6px' }}></i> Masuk sebagai {loginAs === 'driver' ? 'Driver' : 'Admin'}</>
            )}
          </button>
        </form>

        {/* Footer note */}
        <div className="text-center mt-6">
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Hubungi administrator untuk mendapatkan akses.
          </p>
        </div>
      </div>
    </div>
  );
}
