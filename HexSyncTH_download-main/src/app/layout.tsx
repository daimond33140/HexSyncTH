import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XX1 GAME HUB - ศูนย์รวมดาวน์โหลด & เช็คสถานะเกม',
  description: 'เว็บแจกไฟล์และเช็คสถานะเกมระบบ Undetected / Detected พร้อมปุ่มดาวน์โหลด Google Drive และระบบหลังบ้านควบคุมง่าย',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="antialiased selection:bg-purple-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
