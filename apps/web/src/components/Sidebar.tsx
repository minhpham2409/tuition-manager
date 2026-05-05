'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Tổng quan' },
  { href: '/classes', label: 'Lớp học' },
  { href: '/schedule', label: 'Lịch dạy' },
  { href: '/students', label: 'Học sinh' },
  { href: '/invoices', label: 'Học phí' },
  { href: '/history', label: 'Lịch sử' },
  { href: '/settings', label: 'Cài đặt' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Học Phí Pro</h1>
        <p>Quản lý thu phí thông minh</p>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`sidebar-link ${pathname === n.href ? 'active' : ''}`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0] || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout}>Đăng xuất</button>
      </div>
    </aside>
  );
}
