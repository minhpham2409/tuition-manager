'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    api.get('/dashboard/stats').then(setStats);
    api.get('/webhooks/transactions?limit=10').then(setTransactions);
    // Poll for new transactions every 10 seconds
    const interval = setInterval(() => {
      api.get('/dashboard/stats').then(setStats);
      api.get('/webhooks/transactions?limit=10').then(setTransactions);
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (authLoading || !user) return <div className="loading"><div className="spinner" /></div>;

  const maxRev = stats?.revenueByMonth?.reduce((m: number, r: any) => Math.max(m, r.revenue), 1) || 1;

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <div className="mobile-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span style={{ fontWeight: 700 }}>Tổng quan</span>
        </div>
        <div className="page-header">
          <h1 className="page-title">Xin chào, <span>{user.name}</span> 👋</h1>
        </div>

        {stats ? (
          <>
            <div className="stats-grid">
              <div className="stat-card purple">
                <div className="stat-icon">💰</div>
                <div className="stat-label">Đã thu tháng này</div>
                <div className="stat-value money money-green">{formatMoney(stats.paidAmount)}</div>
              </div>
              <div className="stat-card red">
                <div className="stat-icon">⏳</div>
                <div className="stat-label">Chưa thu</div>
                <div className="stat-value money money-red">{formatMoney(stats.unpaidAmount)}</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">📚</div>
                <div className="stat-label">Số lớp</div>
                <div className="stat-value">{stats.classes}</div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon">🎓</div>
                <div className="stat-label">Số học sinh</div>
                <div className="stat-value">{stats.students}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="card">
                <div className="card-title">📈 Doanh thu 6 tháng</div>
                <div className="chart-container">
                  {stats.revenueByMonth?.map((r: any, i: number) => (
                    <div className="chart-bar-wrapper" key={i}>
                      <div className="chart-bar-value">{r.revenue > 0 ? formatMoney(r.revenue) : ''}</div>
                      <div className="chart-bar" style={{ height: `${Math.max((r.revenue / maxRev) * 160, 4)}px` }} />
                      <div className="chart-bar-label">{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-title">🔔 Chưa đóng phí</div>
                {stats.unpaidStudents?.length > 0 ? (
                  <table className="data-table">
                    <thead><tr><th>Học sinh</th><th>Lớp</th><th>Số tiền</th></tr></thead>
                    <tbody>
                      {stats.unpaidStudents.map((inv: any) => (
                        <tr key={inv.id}>
                          <td style={{ color: 'var(--text)', fontWeight: 600 }}>{inv.student.name}</td>
                          <td>{inv.student.class.name}</td>
                          <td className="money money-red">{formatMoney(inv.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state"><div className="empty-state-icon">🎉</div><div className="empty-state-text">Tất cả đã đóng!</div></div>
                )}
              </div>
            </div>

            {/* Real-time Transaction Feed */}
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">⚡ Giao dịch gần đây <span style={{ fontSize: '.72rem', color: 'var(--text-3)', fontWeight: 400, marginLeft: 'auto' }}>Tự động cập nhật mỗi 10s</span></div>
              {transactions.length > 0 ? (
                <div className="tx-feed">
                  {transactions.map((tx: any) => (
                    <div className="tx-item" key={tx.id}>
                      <div className={`tx-dot ${tx.matched ? 'matched' : 'unmatched'}`} />
                      <div className="tx-content">
                        <div>{tx.content}</div>
                        <div className="tx-time">{tx.gateway} • {new Date(tx.createdAt).toLocaleString('vi-VN')}</div>
                      </div>
                      <div className="tx-amount">+{formatMoney(tx.amount)}</div>
                      <span className={`badge ${tx.matched ? 'badge-paid' : 'badge-unpaid'}`}>
                        {tx.matched ? '✓ Khớp' : '? Chưa khớp'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-text" style={{ fontSize: '.82rem' }}>Chưa có giao dịch nào. Khi phụ huynh chuyển khoản, giao dịch sẽ hiện ở đây tự động.</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="loading"><div className="spinner" /></div>
        )}
      </main>
    </div>
  );
}
