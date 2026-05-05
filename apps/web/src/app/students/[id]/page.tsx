'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'overview' | 'attendance' | 'invoices'>('overview');
  const [toast, setToast] = useState('');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => {
    if (user) api.get(`/students/${resolvedParams.id}/stats`).then(setData);
  }, [user, resolvedParams.id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  if (al || !user || !data) return <div className="loading"><div className="spinner" /></div>;

  const maxTrend = Math.max(...(data.monthlyTrend?.map((t: any) => t.total) || [1]), 1);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push('/students')} style={{ marginBottom: 8 }}>← Quay lại</button>
            <h1 className="page-title">{data.name} <span>{data.className}</span></h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/portal/${data.id}`);
              showToast('Đã copy link portal');
            }}>🔗 Copy Portal</button>
          </div>
        </div>

        {/* Info bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', fontSize: '.82rem', color: 'var(--text-2)' }}>
          <span>👤 PH: <strong>{data.parentName}</strong></span>
          {data.parentPhone && <span>📞 {data.parentPhone}</span>}
          <span>🎓 GV: {data.teacherName}</span>
        </div>

        {/* Stats cards */}
        <div className="stats-grid">
          <div className="stat-card green">
            <div className="stat-label">Tỷ lệ đi học</div>
            <div className="stat-value">{data.attendanceRate}%</div>
            <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${data.attendanceRate}%`, height: '100%', background: data.attendanceRate >= 80 ? 'var(--success)' : data.attendanceRate >= 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 2, transition: 'width .8s ease' }} />
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Tổng buổi</div>
            <div className="stat-value">{data.totalLessons}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{data.presentCount} đi · {data.absentCount} nghỉ</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Đã đóng</div>
            <div className="stat-value money money-green">{formatMoney(data.totalPaid)}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Chưa đóng</div>
            <div className="stat-value money money-red">{formatMoney(data.totalUnpaid)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--bg-subtle)', padding: 4, borderRadius: 'var(--radius)' }}>
          {[
            { key: 'overview' as const, label: 'Tổng quan' },
            { key: 'attendance' as const, label: `Điểm danh (${data.totalLessons})` },
            { key: 'invoices' as const, label: `Hóa đơn (${data.invoices.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '8px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: '.82rem', fontWeight: 600, transition: 'all .15s',
                background: tab === t.key ? 'var(--surface)' : 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-3)',
                boxShadow: tab === t.key ? 'var(--shadow-xs)' : 'none',
              }}>{t.label}</button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            {/* Monthly Trend Chart */}
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-title">Xu hướng điểm danh theo tháng</div>
              {data.monthlyTrend.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, paddingTop: 12 }}>
                  {data.monthlyTrend.map((t: any, i: number) => {
                    const pct = (t.total / maxTrend) * 100;
                    const presentPct = t.total > 0 ? (t.present / t.total) * pct : 0;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: '.65rem', fontWeight: 600, color: t.rate >= 80 ? 'var(--success)' : t.rate >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{t.rate}%</span>
                        <div style={{ width: '100%', maxWidth: 40, height: `${Math.max(pct, 6)}%`, borderRadius: '4px 4px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                          <div style={{ height: `${presentPct}%`, background: 'var(--success)', transition: 'height .5s' }} />
                          <div style={{ height: `${pct - presentPct}%`, background: 'var(--danger)', opacity: 0.5, transition: 'height .5s' }} />
                        </div>
                        <span style={{ fontSize: '.65rem', color: 'var(--text-3)', fontWeight: 500 }}>T{t.month}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 20 }}>Chưa có dữ liệu</div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
                <span style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--success)', display: 'inline-block' }} /> Có mặt
                </span>
                <span style={{ fontSize: '.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--danger)', opacity: 0.5, display: 'inline-block' }} /> Vắng
                </span>
              </div>
            </div>

            {/* Recent attendance */}
            <div className="card">
              <div className="card-title">5 buổi gần nhất</div>
              {data.attendances.slice(0, 5).map((att: any, i: number) => {
                const date = new Date(att.date);
                const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '.85rem' }}>{dayName}, {date.toLocaleDateString('vi-VN')}</div>
                      {att.note && <div style={{ fontSize: '.75rem', color: att.present ? 'var(--info)' : 'var(--danger)', marginTop: 2 }}>{att.present ? '📝 ' : 'Lý do: '}{att.note}</div>}
                    </div>
                    <span style={{ fontSize: '.82rem', fontWeight: 600, color: att.present ? 'var(--success)' : 'var(--danger)' }}>
                      {att.present ? '✓ Có mặt' : '✗ Vắng'}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ATTENDANCE TAB */}
        {tab === 'attendance' && (
          <div className="card">
            <div className="card-title">Toàn bộ lịch sử điểm danh</div>
            {data.attendances.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Chưa có dữ liệu điểm danh</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '.82rem' }}>
                  <thead><tr><th>Ngày</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
                  <tbody>
                    {data.attendances.map((att: any, i: number) => {
                      const date = new Date(att.date);
                      const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{dayName}, {date.toLocaleDateString('vi-VN')}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: att.present ? 'var(--success)' : 'var(--danger)' }}>
                              {att.present ? '✓ Có mặt' : '✗ Vắng'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-3)' }}>{att.note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* INVOICES TAB */}
        {tab === 'invoices' && (
          <div className="card">
            <div className="card-title">Lịch sử học phí</div>
            {data.invoices.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>Chưa có hóa đơn</div>
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '.82rem' }}>
                  <thead><tr><th>Tháng</th><th>Buổi học</th><th>Số tiền</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
                  <tbody>
                    {data.invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>T{inv.month}/{inv.year}</td>
                        <td>{inv.lessonsAttended != null ? `${inv.lessonsAttended}/${inv.lessonsTotal}` : '—'}</td>
                        <td className="money">{formatMoney(inv.amount)}</td>
                        <td>
                          <span className={`badge badge-${inv.status === 'PAID' ? 'paid' : 'unpaid'}`}>
                            {inv.status === 'PAID' ? 'Đã đóng' : 'Chưa đóng'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-3)' }}>{inv.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
