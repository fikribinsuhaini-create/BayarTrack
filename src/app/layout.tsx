import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  applicationName: "Komitmen & To-do",
  title: "Komitmen & To-do",
  description: "PWA untuk track komitmen bulanan dan to-do list.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BayarTrack",
  },
  icons: {
    icon: [{ url: "/icon-192.png" }, { url: "/icon-512.png" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ms"
      className="h-full antialiased"
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
