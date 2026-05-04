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
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">📖 Học Phí Pro</h1>
        <p className="auth-subtitle">Đăng nhập để quản lý học phí</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="me@demo.com" required />
          </div>
          <div className="form-group"><label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
          </button>
        </form>
        <p className="auth-link">Chưa có tài khoản? <a href="/register">Đăng ký ngay</a></p>
      </div>
    </div>
  );
}
