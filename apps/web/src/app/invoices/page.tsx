'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function InvoicesPageWrapper() {
  return <Suspense fallback={<div className="loading"><div className="spinner" /></div>}><InvoicesPage /></Suspense>;
}

function InvoicesPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [month, setMonth] = useState(parseInt(searchParams.get('month') || '') || now.getMonth() + 1);
  const [year, setYear] = useState(parseInt(searchParams.get('year') || '') || now.getFullYear());
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [qrData, setQrData] = useState<any>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => { if (user) api.get('/classes').then(setClasses); }, [user]);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    p.set('month', String(month)); p.set('year', String(year));
    if (filterClass) p.set('classId', filterClass);
    if (filterStatus) p.set('status', filterStatus);
    api.get(`/invoices?${p}`).then(setInvoices).catch(console.error);
  }, [month, year, filterClass, filterStatus]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const showQR = async (id: string) => { const data = await api.get(`/invoices/${id}/qr`); if (data.error) return alert(data.error); setQrData(data); };
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const markAsPaid = async (id: string) => {
    if (!confirm('Bạn có chắc muốn cập nhật hóa đơn này thành ĐÃ ĐÓNG? Thao tác này không thể hoàn tác.')) return;
    try {
      await api.patch(`/invoices/${id}`, { status: 'PAID' });
      showToast('Đã cập nhật trạng thái hóa đơn');
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const sendZalo = (inv: any) => {
    const phone = inv.student.parentPhone;
    const payUrl = `${window.location.origin}/pay/${inv.id}`;
    const lessonInfo = inv.lessonsAttended != null
      ? `\nSố buổi học: ${inv.lessonsAttended}/${inv.lessonsTotal} buổi${inv.note && inv.note.startsWith('Nghỉ') ? `\n${inv.note}` : ''}`
      : '';
    const msg = `Kính gửi PH ${inv.student.parentName},\n\nNHẮC ĐÓNG HỌC PHÍ THÁNG ${month}/${year}\nLớp: ${inv.student.class?.name}\nHọc sinh: ${inv.student.name}${lessonInfo}\n\nSố tiền: ${formatMoney(inv.amount)}\nLink thanh toán: ${payUrl}\n\nXin cảm ơn!`;
    navigator.clipboard.writeText(msg).then(() => showToast('Đã copy tin nhắn'));
    if (phone) {
      const zaloPhone = phone.replace(/^0/, '84');
      window.open(`https://zalo.me/${zaloPhone}`, '_blank');
    }
  };

  const batchReminder = () => {
    const unpaidList = invoices.filter(i => i.status !== 'PAID');
    if (!unpaidList.length) return showToast('Tất cả đã đóng');
    const msg = unpaidList.map(inv => {
      const payUrl = `${window.location.origin}/pay/${inv.id}`;
      return `• ${inv.student.name} (${inv.student.class?.name}) — ${formatMoney(inv.amount)}\n  ${payUrl}`;
    }).join('\n\n');
    navigator.clipboard.writeText(`Danh sách học phí chưa đóng T${month}/${year}:\n\n${msg}`);
    showToast(`Đã copy ${unpaidList.length} học sinh chưa đóng`);
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const paid = invoices.filter(i => i.status === 'PAID');
  const unpaid = invoices.filter(i => i.status !== 'PAID');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Quản lý <span>Học phí</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {unpaid.length > 0 && <button className="btn btn-secondary" onClick={batchReminder}>Nhắc phí ({unpaid.length})</button>}
          </div>
        </div>

        <div className="filters-bar">
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="form-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="PAID">Đã đóng</option>
            <option value="UNPAID">Chưa đóng</option>
          </select>
          <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: 'auto' }}>
            {paid.length} đã đóng · {unpaid.length} chưa đóng
          </span>
        </div>

        <div className="card">
          {invoices.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Học sinh</th><th>Lớp</th><th>Số tiền</th><th>Buổi học</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{inv.student.name}</td>
                    <td>{inv.student.class?.name}</td>
                    <td className="money">{formatMoney(inv.amount)}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>
                      {inv.lessonsAttended != null ? `${inv.lessonsAttended}/${inv.lessonsTotal} buổi` : '—'}
                      {inv.note && inv.note.startsWith('Nghỉ') && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>· {inv.note}</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${inv.status === 'PAID' ? 'paid' : 'unpaid'}`}>
                        {inv.status === 'PAID' ? 'Đã đóng' : 'Chưa đóng'}
                      </span>
                      {inv.paidAt && <div style={{ fontSize: '.68rem', color: 'var(--text-3)', marginTop: 2 }}>{new Date(inv.paidAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>}
                    </td>
                    <td style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => showQR(inv.id)}>QR</button>
                      {inv.status !== 'PAID' && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => markAsPaid(inv.id)}>Đã thu</button>
                          <button className="btn btn-sm btn-primary" onClick={() => sendZalo(inv)}>Zalo</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-text">Chưa có hóa đơn tháng {month}/{year}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-3)' }}>Vào Lịch dạy để tạo buổi dạy và xuất hóa đơn</div>
            </div>
          )}
        </div>

        {qrData && (
          <div className="qr-overlay" onClick={() => setQrData(null)}>
            <div className="qr-card" onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>{qrData.studentName}</div>
              <div style={{ fontSize: '.85rem', color: 'var(--text-3)', marginBottom: 16 }}>{qrData.className} · T{qrData.month}/{qrData.year}</div>
              <div className="money money-green" style={{ fontSize: '1.3rem', marginBottom: 16 }}>{formatMoney(qrData.amount)}</div>
              <img src={qrData.qrUrl} alt="QR" style={{ width: '100%', maxWidth: 280, borderRadius: 12, margin: '0 auto', display: 'block' }} />
              <div style={{ marginTop: 16, fontSize: '.78rem', color: 'var(--text-3)' }}>
                Nội dung: <strong style={{ color: 'var(--text)' }}>{qrData.transferContent}</strong>
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setQrData(null)}>Đóng</button>
            </div>
          </div>
        )}
        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
