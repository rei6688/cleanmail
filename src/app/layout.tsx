import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CleanMail",
  description: "Clean your Outlook inbox with rules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
