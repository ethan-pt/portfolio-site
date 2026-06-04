import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ethan Tubbe - Software Engineer",
  description: "Software engineer with a passion for solving hard problems and building great products.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Ethan Tubbe - Software Engineer",
    description: "Software engineer with a passion for solving hard problems and building great products.",
    url: "https://ethan-pt.dev/",
    type: "profile",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
