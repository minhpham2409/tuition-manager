'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function InvoicesPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
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
  useEffect(() => { if (!user) return; const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [user, load]);

  const generate = async () => {
    if (!filterClass) return alert('Vui lòng chọn lớp trước');
    const res = await api.post('/invoices/generate', { classId: filterClass, month, year });
    showToast(`Đã tạo ${res.created}/${res.total} hóa đơn`); load();
  };


  const showQR = async (id: string) => { const data = await api.get(`/invoices/${id}/qr`); if (data.error) return alert(data.error); setQrData(data); };
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Send payment link via Zalo
  const sendZalo = (inv: any) => {
    const phone = inv.student.parentPhone;
    const payUrl = `${window.location.origin}/pay/${inv.id}`;
    const msg = `Chào phụ huynh ${inv.student.parentName},\n\nNhắc đóng học phí tháng ${month}/${year} cho bé ${inv.student.name}.\n💰 Số tiền: ${formatMoney(inv.amount)}\n📱 Link thanh toán: ${payUrl}\n\nXin cảm ơn! 🙏`;

    // Copy message to clipboard
    navigator.clipboard.writeText(msg).then(() => {
      showToast('📋 Đã copy tin nhắn! Mở Zalo để gửi');
    });

    // Open Zalo chat with parent's phone number
    if (phone) {
      // Remove leading 0 and add country code
      const cleanPhone = phone.replace(/^0/, '84').replace(/\D/g, '');
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    } else {
      showToast('⚠️ Phụ huynh chưa có SĐT. Đã copy tin nhắn.');
    }
  };

  // Batch send to all unpaid
  const sendAllZalo = () => {
    const unpaidList = invoices.filter(i => i.status !== 'PAID');
    if (unpaidList.length === 0) return showToast('Tất cả đã đóng!');

    const lines = unpaidList.map(inv =>
      `• ${inv.student.name} (${inv.student.parentName}) - ${formatMoney(inv.amount)}\n  👉 ${window.location.origin}/pay/${inv.id}`
    ).join('\n\n');

    const msg = `📢 NHẮC HỌC PHÍ THÁNG ${month}/${year}\n\n${lines}\n\nVui lòng thanh toán qua link hoặc quét QR. Xin cảm ơn! 🙏`;
    navigator.clipboard.writeText(msg).then(() => showToast(`📋 Đã copy danh sách ${unpaidList.length} học sinh chưa đóng!`));
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const paid = invoices.filter(i => i.status === 'PAID');
  const unpaid = invoices.filter(i => i.status !== 'PAID');

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">💳 Quản lý <span>Học phí</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {unpaid.length > 0 && <button className="btn btn-secondary" onClick={sendAllZalo} title="Copy danh sách nhắc phí">📢 Nhắc phí ({unpaid.length})</button>}
            <button className="btn btn-primary" onClick={generate}>⚡ Tạo phí tháng {month}</button>
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
            <option value="">Tất cả</option><option value="UNPAID">Chưa đóng</option><option value="PAID">Đã đóng</option>
          </select>
          <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: 'auto' }}>
            ✅ {paid.length} đã đóng &nbsp;|&nbsp; 🔴 {unpaid.length} chưa đóng
          </span>
        </div>

        <div className="card">
          {invoices.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>Học sinh</th><th>Lớp</th><th>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{inv.student.name}</td>
                    <td>{inv.student.class?.name}</td>
                    <td className="money">{formatMoney(inv.amount)}</td>
                    <td>
                      <span className={`badge badge-${inv.status === 'PAID' ? 'paid' : inv.status === 'PARTIAL' ? 'partial' : 'unpaid'}`}>
                        {inv.status === 'PAID' ? '✅ Đã đóng' : inv.status === 'PARTIAL' ? '🟡 Một phần' : '🔴 Chưa đóng'}
                      </span>
                      {inv.paidAt && <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 2 }}>{new Date(inv.paidAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>}
                    </td>
                    <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => showQR(inv.id)}>📱 QR</button>
                      {inv.status !== 'PAID' && <button className="btn btn-sm" style={{ background: '#0068FF', color: '#fff' }} onClick={() => sendZalo(inv)}>💬 Zalo</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Chưa có hóa đơn tháng {month}/{year}</div>
              <button className="btn btn-primary" onClick={generate}>⚡ Tạo phí cho lớp</button></div>
          )}
        </div>

        {qrData && (
          <div className="modal-overlay" onClick={() => setQrData(null)}>
            <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">Mã QR thanh toán<button className="modal-close" onClick={() => setQrData(null)}>✕</button></div>
              <p style={{ color: 'var(--text-3)', fontSize: '.85rem', marginBottom: 12 }}>Gửi cho phụ huynh qua Zalo</p>
              <img className="qr-image" src={qrData.qrUrl} alt="VietQR" />
              <div className="qr-info">
                <div className="qr-info-row"><span className="qr-info-label">Học sinh</span><span className="qr-info-value">{qrData.studentName}</span></div>
                <div className="qr-info-row"><span className="qr-info-label">Tháng</span><span className="qr-info-value">{qrData.month}/{qrData.year}</span></div>
                <div className="qr-info-row"><span className="qr-info-label">Số tiền</span><span className="qr-info-value money-green">{formatMoney(qrData.amount)}</span></div>
                <div className="qr-info-row"><span className="qr-info-label">Ngân hàng</span><span className="qr-info-value">{qrData.bankId}</span></div>
                <div className="qr-info-row"><span className="qr-info-label">Số TK</span><span className="qr-info-value">{qrData.accountNo}</span></div>
                <div className="qr-info-row"><span className="qr-info-label">Nội dung CK</span><span className="qr-info-value">{qrData.description}</span></div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-sm" style={{ background: '#0068FF', color: '#fff' }} onClick={() => {
                  const payUrl = `${window.location.origin}/pay/${qrData.invoiceId || ''}`;
                  navigator.clipboard.writeText(`Nhắc học phí T${qrData.month} - ${qrData.studentName}\n💰 ${formatMoney(qrData.amount)}\n👉 ${payUrl}`);
                  showToast('📋 Đã copy!');
                }}>📋 Copy & gửi Zalo</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
