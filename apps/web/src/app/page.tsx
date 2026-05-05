'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [stats, setStats] = useState<any>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => {
    if (user) api.get(`/dashboard/stats?month=${month}&year=${year}`).then(setStats);
  }, [user, month, year]);

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  const maxRevenue = Math.max(...(stats?.revenueByMonth?.map((r: any) => r.revenue) || [1]), 1);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Tổng quan <span>Tháng {month}/{year}</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
              {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
            </select>
            <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="stat-card purple">
            <div className="stat-label">Lớp học</div>
            <div className="stat-value">{stats?.classes || 0}</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Học sinh</div>
            <div className="stat-value">{stats?.students || 0}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Đã thu</div>
            <div className="stat-value money money-green">{formatMoney(stats?.paidAmount || 0)}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{stats?.paidCount || 0} hóa đơn</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Chưa thu</div>
            <div className="stat-value money money-red">{formatMoney(stats?.unpaidAmount || 0)}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{stats?.unpaidCount || 0} hóa đơn</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Tỷ lệ thu</div>
            <div className="stat-value">{stats?.collectionRate || 0}%</div>
            <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${stats?.collectionRate || 0}%`, height: '100%', background: 'var(--success)', borderRadius: 2, transition: 'width .8s ease' }} />
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginBottom: 14 }}>
          {/* Revenue chart */}
          <div className="card">
            <div className="card-title">Doanh thu 6 tháng</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 12 }}>
              {stats?.revenueByMonth?.map((r: any, i: number) => {
                const pct = maxRevenue > 0 ? (r.revenue / maxRevenue) * 100 : 0;
                const isCurrent = r.month === month && r.year === year;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: r.revenue > 0 ? 'var(--text)' : 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                      {r.revenue > 0 ? formatMoney(r.revenue) : '—'}
                    </span>
                    <div style={{
                      width: '100%', maxWidth: 48, borderRadius: '6px 6px 0 0',
                      height: `${Math.max(pct, 4)}%`,
                      background: isCurrent ? 'var(--accent)' : r.revenue > 0 ? 'var(--accent-light)' : 'var(--border)',
                      transition: 'height .6s ease, background .3s ease',
                    }} />
                    <span style={{ fontSize: '.68rem', color: isCurrent ? 'var(--accent)' : 'var(--text-3)', fontWeight: isCurrent ? 700 : 500 }}>
                      T{r.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lesson summary */}
          <div className="card">
            <div className="card-title">Buổi dạy tháng này</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '16px 0' }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg viewBox="0 0 36 36" style={{ width: 100, height: 100, transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" strokeWidth="3"
                    strokeDasharray={`${stats?.totalLessons > 0 ? (stats.taughtLessons / stats.totalLessons) * 88 : 0} 88`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray .8s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{stats?.taughtLessons || 0}</span>
                  <span style={{ fontSize: '.62rem', color: 'var(--text-3)', fontWeight: 500 }}>/{stats?.totalLessons || 0} buổi</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />
                  <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>Đã dạy: <strong>{stats?.taughtLessons || 0}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--border)' }} />
                  <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>Còn lại: <strong>{(stats?.totalLessons || 0) - (stats?.taughtLessons || 0)}</strong></span>
                </div>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={() => router.push('/schedule')}>Xem lịch dạy</button>
          </div>
        </div>

        {/* Class breakdown table */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Chi tiết theo lớp</div>
          {stats?.classBreakdown?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr><th>Lớp</th><th>Sĩ số</th><th>Giá/buổi</th><th>Tổng phí</th><th>Đã thu</th><th>Chưa thu</th><th>Tiến độ</th></tr>
              </thead>
              <tbody>
                {stats.classBreakdown.map((cls: any) => {
                  const rate = cls.totalInvoices > 0 ? Math.round((cls.paidCount / cls.totalInvoices) * 100) : 0;
                  return (
                    <tr key={cls.name}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{cls.name}</td>
                      <td>{cls.studentCount}</td>
                      <td className="money">{cls.pricePerLesson ? formatMoney(cls.pricePerLesson) : '—'}</td>
                      <td className="money">{formatMoney(cls.totalAmount)}</td>
                      <td className="money money-green">{formatMoney(cls.paidAmount)}</td>
                      <td>
                        {cls.unpaidCount > 0 ? (
                          <span className="badge badge-unpaid">{cls.unpaidCount} chưa đóng</span>
                        ) : (
                          <span className="badge badge-paid">Đã thu đủ</span>
                        )}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              width: `${rate}%`, height: '100%', borderRadius: 3,
                              background: rate === 100 ? 'var(--success)' : rate > 50 ? 'var(--warning)' : 'var(--danger)',
                              transition: 'width .6s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text-3)', minWidth: 28 }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="empty-state-text">Chưa có dữ liệu</div></div>
          )}
        </div>

        {/* Unpaid list */}
        {stats?.unpaidStudents?.length > 0 && (
          <div className="card">
            <div className="card-title">Học sinh chưa đóng phí</div>
            <table className="data-table">
              <thead><tr><th>Học sinh</th><th>Lớp</th><th>Số tiền</th><th>Thao tác</th></tr></thead>
              <tbody>
                {stats.unpaidStudents.map((inv: any) => (
                  <tr key={inv.id}>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>{inv.student.name}</td>
                    <td>{inv.student.class?.name}</td>
                    <td className="money money-red">{formatMoney(inv.amount)}</td>
                    <td>
                      <button className="btn btn-sm btn-ghost" onClick={() => router.push(`/invoices?month=${month}&year=${year}`)}>Xem</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
