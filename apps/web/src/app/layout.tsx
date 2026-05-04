import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = { title: 'Quản Lý Học Phí', description: 'Phần mềm quản lý học phí cho giáo viên' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
