'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const BANKS = [
  { id: 'BIDV', name: 'BIDV' }, { id: 'VCB', name: 'Vietcombank' }, { id: 'ICB', name: 'VietinBank' },
  { id: 'MB', name: 'MB Bank' }, { id: 'TCB', name: 'Techcombank' }, { id: 'ACB', name: 'ACB' },
  { id: 'VPB', name: 'VPBank' }, { id: 'TPB', name: 'TPBank' }, { id: 'STB', name: 'Sacombank' },
  { id: 'HDB', name: 'HDBank' }, { id: 'VIETCAPITALBANK', name: 'Viet Capital Bank' },
  { id: 'SCB', name: 'SCB' }, { id: 'VIB', name: 'VIB' }, { id: 'SHB', name: 'SHB' },
  { id: 'EIB', name: 'Eximbank' }, { id: 'MSB', name: 'MSB' }, { id: 'LPB', name: 'LienVietPostBank' },
  { id: 'SEABANK', name: 'SeABank' }, { id: 'OCB', name: 'OCB' }, { id: 'NAB', name: 'Nam A Bank' },
];

export default function SettingsPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ bankId: 'BIDV', accountNo: '', accountName: '' });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => {
    if (user) api.get('/bank-accounts').then(data => { if (data) setForm({ bankId: data.bankId, accountNo: data.accountNo, accountName: data.accountName }); });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await api.post('/bank-accounts', form);
    setSaved(true); setLoading(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const previewUrl = form.accountNo
    ? `https://img.vietqr.io/image/${form.bankId}-${form.accountNo}-compact2.png?amount=500000&addInfo=HP%20T${new Date().getMonth() + 1}%20Demo&accountName=${encodeURIComponent(form.accountName)}`
    : '';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header"><h1 className="page-title">⚙️ <span>Cài đặt</span></h1></div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
          <div className="card">
            <div className="card-title">🏦 Tài khoản ngân hàng</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 20 }}>Thông tin này sẽ được dùng để tạo mã QR thanh toán cho phụ huynh</p>
            <form onSubmit={save}>
              <div className="form-group">
                <label className="form-label">Ngân hàng</label>
                <select className="form-select" value={form.bankId} onChange={e => setForm({ ...form, bankId: e.target.value })}>
                  {BANKS.map(b => <option key={b.id} value={b.id}>{b.name} ({b.id})</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Số tài khoản</label><input className="form-input" value={form.accountNo} onChange={e => setForm({ ...form, accountNo: e.target.value })} placeholder="VD: 4710000000000" required /></div>
              <div className="form-group"><label className="form-label">Tên chủ tài khoản</label><input className="form-input" value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} placeholder="VD: NGUYEN THI A" required /></div>
              <button className="btn btn-primary" disabled={loading}>{loading ? 'Đang lưu...' : '💾 Lưu cài đặt'}</button>
              {saved && <span style={{ marginLeft: 12, color: 'var(--green)', fontSize: '0.85rem' }}>✅ Đã lưu!</span>}
            </form>
          </div>

          <div className="card">
            <div className="card-title">👁 Xem trước mã QR</div>
            {previewUrl ? (
              <div style={{ textAlign: 'center' }}>
                <img src={previewUrl} alt="QR Preview" style={{ width: 260, borderRadius: 12, border: '1px solid var(--border)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 8 }}>Đây là QR mẫu với số tiền 500,000đ</p>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">🏦</div><div className="empty-state-text">Nhập số tài khoản để xem trước</div></div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
