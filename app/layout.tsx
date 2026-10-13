import type { Metadata } from "next";
import { DM_Mono, Geist, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mason Miller",
  description:
    "CS student at the University of Michigan interested in systems and high-performance I/O.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${hanken.variable} ${dmMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
