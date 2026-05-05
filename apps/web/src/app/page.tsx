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
  const [month] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);
  useEffect(() => {
    if (user) api.get(`/dashboard/stats?month=${month}&year=${year}`).then(setStats);
  }, [user, month, year]);

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Tổng quan <span>Tháng {month}/{year}</span></h1>
        </div>

        <div className="stats-grid">
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
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{stats?.paidCount || 0} học sinh</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Chưa thu</div>
            <div className="stat-value money money-red">{formatMoney(stats?.unpaidAmount || 0)}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 4 }}>{stats?.unpaidCount || 0} học sinh</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="card-title">Doanh thu 6 tháng gần nhất</div>
            {stats?.revenueByMonth?.map((r: any) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '.85rem', color: 'var(--text-2)', fontWeight: 500 }}>{r.label}</span>
                <span className="money" style={{ fontSize: '.85rem' }}>{formatMoney(r.revenue)}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-title">Chưa đóng phí</div>
            {stats?.unpaidStudents?.length > 0 ? stats.unpaidStudents.map((inv: any) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{inv.student.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>{inv.student.class?.name}</div>
                </div>
                <span className="money money-red" style={{ fontSize: '.85rem' }}>{formatMoney(inv.amount)}</span>
              </div>
            )) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '.85rem' }}>
                Tất cả đã đóng phí
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
