'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export default function PayPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/public/invoice/${params.id}`)
      .then(r => { if (!r.ok) throw new Error('Không tìm thấy'); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message));
  }, [params.id]);

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EF', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#71717A' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
        <div>{error}</div>
      </div>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EF' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E4E4E7', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isPaid = data.status === 'PAID';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#F0FDFA 0%,#FAFAF7 50%,#FEF3C7 100%)', padding: '24px 16px', fontFamily: "'Inter',system-ui,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', border: '1px solid #E4E4E7' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1A1A1E', marginBottom: 4 }}>📖 PhamMinh Tool</div>
          <div style={{ fontSize: '.82rem', color: '#A1A1AA' }}>Thông báo học phí từ {data.teacherName}</div>
        </div>

        {/* Student Info */}
        <div style={{ background: '#F4F4F5', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#71717A', fontSize: '.82rem' }}>Học sinh</span>
            <span style={{ fontWeight: 700, color: '#1A1A1E' }}>{data.studentName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#71717A', fontSize: '.82rem' }}>Lớp</span>
            <span style={{ fontWeight: 600, color: '#52525B' }}>{data.className}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#71717A', fontSize: '.82rem' }}>Tháng</span>
            <span style={{ fontWeight: 600, color: '#52525B' }}>{data.month}/{data.year}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717A', fontSize: '.82rem' }}>Số tiền</span>
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: isPaid ? '#059669' : '#E11D48' }}>{fmt(data.amount)}</span>
          </div>
        </div>

        {/* Status */}
        {isPaid ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, color: '#059669', fontSize: '1.1rem' }}>Đã thanh toán</div>
            <div style={{ color: '#A1A1AA', fontSize: '.82rem', marginTop: 4 }}>
              Ngày {data.paidAt ? new Date(data.paidAt).toLocaleDateString('vi-VN') : ''}
            </div>
          </div>
        ) : (
          <>
            {/* QR Code */}
            {data.qrUrl && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '.82rem', color: '#52525B', marginBottom: 10, fontWeight: 600 }}>Quét mã QR để thanh toán</div>
                <img src={data.qrUrl} alt="QR Code" style={{ width: 260, borderRadius: 12, border: '1px solid #E4E4E7', margin: '0 auto', display: 'block' }} />
              </div>
            )}

            {/* Bank Info */}
            {data.bank && (
              <div style={{ marginTop: 16, background: '#F4F4F5', borderRadius: 12, padding: '14px 16px', fontSize: '.82rem' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#1A1A1E' }}>Hoặc chuyển khoản thủ công:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E4E4E7' }}>
                  <span style={{ color: '#71717A' }}>Ngân hàng</span><span style={{ fontWeight: 600 }}>{data.bank.bankId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E4E4E7' }}>
                  <span style={{ color: '#71717A' }}>Số TK</span><span style={{ fontWeight: 600 }}>{data.bank.accountNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #E4E4E7' }}>
                  <span style={{ color: '#71717A' }}>Chủ TK</span><span style={{ fontWeight: 600 }}>{data.bank.accountName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ color: '#71717A' }}>Nội dung CK</span><span style={{ fontWeight: 700, color: '#E11D48' }}>{data.description}</span>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 16, color: '#A1A1AA', fontSize: '.75rem' }}>
              ⚠️ Vui lòng ghi đúng nội dung chuyển khoản để được ghi nhận tự động
            </div>
          </>
        )}
      </div>
    </div>
  );
}
