'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function HistoryPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<'table' | 'timeline'>('table');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => {
    if (user) api.get(`/dashboard/history?month=${month}&year=${year}`).then(setData);
  }, [user, month, year]);

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const s = data?.summary;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">📋 Lịch sử <span>Thanh toán</span></h1>
        </div>

        {/* Month selector */}
        <div className="filters-bar">
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className={`btn btn-sm ${view === 'table' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('table')}>📊 Bảng</button>
            <button className={`btn btn-sm ${view === 'timeline' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('timeline')}>🕐 Dòng thời gian</button>
          </div>
        </div>

        {/* Summary cards */}
        {s && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
            <div className="stat-card purple">
              <div className="stat-icon">📋</div>
              <div className="stat-label">Tổng hóa đơn</div>
              <div className="stat-value">{s.total}</div>
            </div>
            <div className="stat-card green">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Đã thu</div>
              <div className="stat-value money money-green">{formatMoney(s.paidAmount)}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{s.paidCount} học sinh</div>
            </div>
            <div className="stat-card red">
              <div className="stat-icon">🔴</div>
              <div className="stat-label">Chưa thu</div>
              <div className="stat-value money money-red">{formatMoney(s.unpaidAmount)}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>{s.unpaidCount} học sinh</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-icon">📈</div>
              <div className="stat-label">Tỷ lệ thu</div>
              <div className="stat-value">{s.total > 0 ? Math.round((s.paidCount / s.total) * 100) : 0}%</div>
              <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: `${s.total > 0 ? (s.paidCount / s.total) * 100 : 0}%`, height: '100%', background: 'var(--emerald)', borderRadius: 3, transition: 'width .5s ease' }} />
              </div>
            </div>
          </div>
        )}

        {data && view === 'table' && (
          <div className="card">
            <div className="card-title">📊 Chi tiết tháng {month}/{year}</div>
            {data.invoices.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Lớp</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày đóng</th>
                    <th>Hình thức</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{inv.studentName}</td>
                      <td>{inv.className}</td>
                      <td className="money">{formatMoney(inv.amount)}</td>
                      <td>
                        <span className={`badge badge-${inv.status === 'PAID' ? 'paid' : 'unpaid'}`}>
                          {inv.status === 'PAID' ? '✅ Đã đóng' : '🔴 Chưa đóng'}
                        </span>
                      </td>
                      <td style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td>
                        {inv.note?.startsWith('Auto:') ? (
                          <span className="badge" style={{ background: 'var(--sky-bg)', color: 'var(--sky)' }}>⚡ Tự động</span>
                        ) : inv.status === 'PAID' ? (
                          <span className="badge" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}>✋ Thủ công</span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '.78rem', color: 'var(--text-3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-text">Chưa có dữ liệu tháng {month}/{year}</div>
              </div>
            )}
          </div>
        )}

        {data && view === 'timeline' && (
          <div className="card">
            <div className="card-title">🕐 Dòng thời gian tháng {month}/{year}</div>
            {data.timeline.length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: 28 }}>
                <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                {data.timeline.map((evt: any, i: number) => (
                  <div key={i} style={{ position: 'relative', paddingBottom: 20, paddingLeft: 20 }}>
                    <div style={{
                      position: 'absolute', left: -22, top: 4, width: 14, height: 14, borderRadius: '50%',
                      background: evt.type === 'auto' ? 'var(--sky)' : 'var(--amber)',
                      border: '3px solid var(--surface)', boxShadow: 'var(--shadow-sm)',
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.92rem' }}>{evt.studentName}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                          {evt.className} • {evt.type === 'auto' ? '⚡ Tự động (webhook)' : '✋ Ghi nhận thủ công'}
                        </div>
                        {evt.note && <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>{evt.note}</div>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="money money-green" style={{ fontWeight: 700 }}>{formatMoney(evt.amount)}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                          {new Date(evt.date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🕐</div>
                <div className="empty-state-text">Chưa có thanh toán nào trong tháng {month}/{year}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
