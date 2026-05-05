'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await register(name, email, password); router.push('/'); }
    catch (err: any) { setError(err.message || 'Đăng ký thất bại'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">📖 PhamMinh Tool</h1>
        <p className="login-subtitle">Tạo tài khoản giáo viên</p>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--danger-bg, #fee2e2)', color: 'var(--danger, #dc2626)', fontSize: '.82rem', fontWeight: 500, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input className="form-input" style={{ width: '100%' }} value={name} onChange={e => setName(e.target.value)} placeholder="Cô Nguyễn Thị A" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" style={{ width: '100%' }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" style={{ width: '100%' }} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" required minLength={6} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px' }} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Đăng ký →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '.82rem', color: 'var(--text-3)' }}>
          Đã có tài khoản? <a href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Đăng nhập</a>
        </p>
      </div>
    </div>
  );
}
