'use client';
import { useState, useEffect, use } from 'react';
import { api, formatMoney } from '@/lib/api';

export default function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/public/portal/${resolvedParams.id}`)
      .then(res => {
        if (res.error) setError(true);
        else setData(res);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (error || !data) return (
    <div className="empty-state" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="empty-state-icon">❌</div>
      <div className="empty-state-text">Không tìm thấy thông tin học sinh</div>
    </div>
  );

  const taught = data.attendances.filter((a: any) => a.taught);
  const presentCount = taught.filter((a: any) => a.present).length;
  const absentCount = taught.length - presentCount;
  const rate = taught.length > 0 ? Math.round((presentCount / taught.length) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
        
        {/* Header */}
        <div style={{ background: 'var(--accent)', padding: '24px 20px', color: '#fff' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 4 }}>Cổng thông tin Phụ huynh</h1>
          <p style={{ opacity: 0.9, fontSize: '.85rem' }}>Giáo viên: {data.teacherName}</p>
        </div>

        <div style={{ padding: '24px 20px' }}>
          {/* Student info + summary stats */}
          <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontSize: '.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 8 }}>Học sinh</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{data.name}</div>
            <div style={{ fontSize: '.9rem', color: 'var(--text-2)', marginBottom: 12 }}>Lớp: <strong>{data.className}</strong></div>
            
            {taught.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#e8f7ef', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>{presentCount}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--success)' }}>Có mặt</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#fce8e8', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--danger)' }}>{absentCount}</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--danger)' }}>Vắng</div>
                </div>
                <div style={{ flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: '#e8f1fc', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--info)' }}>{rate}%</div>
                  <div style={{ fontSize: '.65rem', color: 'var(--info)' }}>Tỷ lệ</div>
                </div>
              </div>
            )}
          </div>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Hóa đơn học phí</h2>
          {data.invoices.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>Chưa có hóa đơn nào.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
              {data.invoices.map((inv: any) => (
                <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text)' }}>Tháng {inv.month}/{inv.year}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-3)', marginTop: 2 }}>{inv.lessonsAttended} buổi học</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`money ${inv.status === 'PAID' ? 'money-green' : 'money-red'}`} style={{ fontSize: '.95rem', marginBottom: 4 }}>
                      {formatMoney(inv.amount)}
                    </div>
                    {inv.status === 'PAID' ? (
                      <span className="badge badge-paid">Đã đóng</span>
                    ) : (
                      <a href={`/pay/${inv.id}`} className="btn btn-primary btn-sm" style={{ padding: '4px 10px', fontSize: '.75rem' }}>Thanh toán</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Lịch sử điểm danh</h2>
          {taught.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>Chưa có dữ liệu điểm danh.</div>
          ) : (
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {taught.map((att: any, i: number) => {
                const date = new Date(att.date);
                const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i === taught.length - 1 ? 'none' : '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '.88rem', color: 'var(--text)' }}>{dayName}, {date.toLocaleDateString('vi-VN')}</div>
                      {att.note && (
                        <div style={{ fontSize: '.75rem', color: att.present ? 'var(--info)' : 'var(--danger)', marginTop: 2 }}>
                          {att.present ? '📝 ' : 'Lý do: '}{att.note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', fontWeight: 600, color: att.present ? 'var(--success)' : 'var(--danger)' }}>
                      {att.present ? '✓ Có mặt' : '✗ Vắng'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
