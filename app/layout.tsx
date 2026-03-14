import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Offer Builder - オファー設計ツール',
  description: '売れるオファーを設計する：価格・特典・保証・パッケージ・緊急性',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
