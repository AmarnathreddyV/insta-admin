import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Influencer Analytics Admin",
  description: "Admin dashboard for influencer analytics",
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
