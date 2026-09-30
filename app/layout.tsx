import "./globals.css";

export const metadata = {
  title: "Influencer Analytics | Admin",
  description: "Private influencer analytics administration dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
