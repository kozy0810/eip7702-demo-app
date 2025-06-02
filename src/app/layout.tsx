import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <MantineProvider>
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}