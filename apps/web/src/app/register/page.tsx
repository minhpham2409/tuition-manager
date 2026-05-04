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
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">📖 Học Phí Pro</h1>
        <p className="auth-subtitle">Tạo tài khoản giáo viên</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Họ tên</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Cô Nguyễn Thị A" required />
          </div>
          <div className="form-group"><label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" required />
          </div>
          <div className="form-group"><label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" required minLength={6} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Đăng ký →'}
          </button>
        </form>
        <p className="auth-link">Đã có tài khoản? <a href="/login">Đăng nhập</a></p>
      </div>
    </div>
  );
}
