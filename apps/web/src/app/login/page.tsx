'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); router.push('/'); }
    catch (err: any) { setError(err.message || 'Đăng nhập thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">PhamMinh Tool</h1>
        <p className="login-subtitle">Đăng nhập để quản lý học phí</p>
        {error && <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '.82rem', fontWeight: 500, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Email</label>
            <input className="form-input" style={{ width: '100%' }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="me@demo.com" required />
          </div>
          <div className="form-group"><label className="form-label">Mật khẩu</label>
            <input className="form-input" style={{ width: '100%' }} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.82rem', color: 'var(--text-3)' }}>Chưa có tài khoản? <a href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Đăng ký</a></p>
      </div>
    </div>
  );
}
