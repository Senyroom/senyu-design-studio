import type { Metadata } from 'next';
import './globals.css';
import { siteUrl } from '../lib/site-url';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: '森语设计所',
  description: '探索设计师在 AI 时代的成长之路',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
