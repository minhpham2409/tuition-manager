'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, formatMoney } from '@/lib/api';
import Sidebar from '@/components/Sidebar';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function TaxReportPage() {
  const { user, loading: al } = useAuth();
  const router = useRouter();
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const [quarter, setQuarter] = useState(currentQuarter);
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
      const data = await api.get(`/dashboard/tax-report?quarter=${quarter}&year=${year}`);
      setReport(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user, quarter, year]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/dashboard/tax-report/export?quarter=${quarter}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `bao-cao-thue-Q${quarter}-${year}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally { setExporting(false); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  if (al || !user) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Báo cáo <span>Thuế</span></h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {report?.isPreview && (
              <div style={{ background: 'var(--warning, #f59e0b)20', border: '1px solid var(--warning, #f59e0b)', borderRadius: 8, padding: '6px 14px', fontSize: '.82rem', color: 'var(--warning, #f59e0b)', alignSelf: 'center' }}>
                📋 Bản xem trước — chưa hết quý
              </div>
            )}
            {report?.canExport && (
              <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
                {exporting ? '⏳ Đang xuất...' : '⬇️ Xuất Excel'}
              </button>
            )}
          </div>
        </div>

        <div className="filters-bar">
          <select className="form-select" value={quarter} onChange={e => setQuarter(+e.target.value)}>
            {[1, 2, 3, 4].map(q => <option key={q} value={q}>Quý {q}</option>)}
          </select>
          <select className="form-select" value={year} onChange={e => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={loadReport} disabled={loading}>
            {loading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>

        {report && (
          <div className="card">
            <div style={{ padding: '0 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                BÁO CÁO THUẾ QUÝ {report.quarter} NĂM {report.year}
              </div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-3)', marginTop: 4 }}>
                Tháng {report.months?.[0]} · Tháng {report.months?.[1]} · Tháng {report.months?.[2]}
                {report.isPreview && ' — Đang xem trước, chưa hoàn tất'}
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Lớp</th>
                    <th style={{ textAlign: 'right' }}>Tháng {report.months?.[0]}</th>
                    <th style={{ textAlign: 'right' }}>Tháng {report.months?.[1]}</th>
                    <th style={{ textAlign: 'right' }}>Tháng {report.months?.[2]}</th>
                    <th style={{ textAlign: 'right' }}>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows?.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-3)', textAlign: 'center' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.className}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{formatMoney(row.months[0])}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{formatMoney(row.months[1])}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{formatMoney(row.months[2])}</td>
                      <td className="money" style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface-2, var(--surface))' }}>
                    <td colSpan={2} style={{ fontWeight: 700, paddingLeft: 12 }}>Tổng</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(report.monthTotals?.[0] || 0)}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(report.monthTotals?.[1] || 0)}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(report.monthTotals?.[2] || 0)}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{formatMoney(report.grandTotal || 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {report.canExport && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--success, #10b981)15', borderRadius: 8, fontSize: '.85rem', color: 'var(--success, #10b981)' }}>
                ✅ Quý đã hoàn tất — Bạn có thể xuất file Excel chính thức để nộp thuế.
              </div>
            )}
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
