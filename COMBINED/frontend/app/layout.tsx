import "./globals.css";

export const metadata = {
  title: "FastFwd",
  description: "FastFwd MVP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}