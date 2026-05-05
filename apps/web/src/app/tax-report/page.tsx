'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function downloadBlob(url: string, filename: string) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Lỗi tải file');
  }
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function TaxReportPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!al && !user) router.push('/login'); }, [user, al]);

  const loadReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get(`/dashboard/tax-report/monthly?month=${month}&year=${year}`);
      setReport(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, month, year]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadBlob(
        `${API}/dashboard/tax-report/monthly/export?month=${month}&year=${year}`,
        `ke-khai-thue-T${month}-${year}.xlsx`
      );
      showToast('✅ Đã tải file kê khai thuế');
    } catch (e: any) { alert(e.message); }
    finally { setExporting(false); }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadBlob(
        `${API}/dashboard/tax-report/template?month=${month}&year=${year}`,
        `mau-ke-khai-thue-T${month}-${year}.xlsx`
      );
      showToast('✅ Đã tải file mẫu — điền vào ô màu vàng rồi lưu lại');
    } catch (e: any) { alert(e.message); }
  };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Kê khai <span>Thuế tháng</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleDownloadTemplate}>📄 Tải file mẫu</button>
            <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
              {exporting ? '⏳ Đang xuất...' : '⬇️ Xuất Excel'}
            </button>
          </div>
        </div>

        {/* Guide */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {[
            { n: '1', title: 'Tải file mẫu', desc: 'Bấm "Tải file mẫu" — Excel có sẵn tên lớp, ô vàng để điền doanh thu' },
            { n: '2', title: 'Điền số liệu', desc: 'Mở file, điền tiền thực tế thu được vào ô màu vàng rồi lưu lại' },
            { n: '3', title: 'Xuất báo cáo', desc: 'Bấm "Xuất Excel" bất cứ lúc nào — lấy số liệu hóa đơn đã thu' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.85rem' }}>{s.title}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 2 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <select className="form-select" value={month} onChange={e => setMonth(+e.target.value)}>
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={loadReport} disabled={loading}>
            {loading ? '⏳ Đang tải...' : '🔄 Xem'}
          </button>
          {report?.isPreview && (
            <span style={{ background: '#f59e0b18', border: '1px solid #f59e0b50', borderRadius: 8, padding: '5px 12px', fontSize: '.78rem', color: '#f59e0b' }}>
              📋 Đang trong tháng — có thể xuất bất cứ lúc nào
            </span>
          )}
        </div>

        {report && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>KÊ KHAI THUẾ THÁNG {report.month}/{report.year}</div>
                <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginTop: 4 }}>
                  {report.isPreview ? '⏳ Đang trong tháng — số liệu tính đến hôm nay' : '✅ Tháng đã kết thúc — số liệu chính thức'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>Tổng doanh thu</div>
                <div className="money" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>
                  {formatMoney(report.grandTotal)}
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>STT</th>
                    <th>Tên lớp</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu T{report.month}/{report.year}</th>
                    <th style={{ textAlign: 'center' }}>Số HĐ đã thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows?.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-3)', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.className}</td>
                      <td className="money" style={{ textAlign: 'right', color: row.amount > 0 ? 'var(--accent)' : 'var(--text-3)', fontWeight: row.amount > 0 ? 700 : 400 }}>
                        {row.amount > 0 ? formatMoney(row.amount) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '.82rem' }}>
                        {row.invoiceCount > 0 ? `${row.invoiceCount} HĐ` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={2} style={{ fontWeight: 700, paddingLeft: 12 }}>TỔNG CỘNG</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent)', fontSize: '1.05rem' }}>
                      {formatMoney(report.grandTotal)}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '.82rem' }}>
                      {report.rows?.reduce((s: number, r: any) => s + r.invoiceCount, 0)} HĐ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownloadTemplate}>
                📄 Tải file mẫu T{month}/{year}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExport} disabled={exporting}>
                {exporting ? '⏳...' : `⬇️ Xuất kê khai T${month}/${year}`}
              </button>
            </div>
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
