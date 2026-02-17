import type { Metadata } from 'next';
import { Provider } from '@/components/ui/provider';

export const metadata: Metadata = {
  title: 'Effort Chart - 努力量記録アプリ',
  description: '日々の活動に費やした時間を記録し、可視化するアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
