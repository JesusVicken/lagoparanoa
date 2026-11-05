import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Registro de Escoamentos | Lago Paranoá",
  description:
    "Registre com foto e localização exata escoamentos e tubulações irregulares de água ou esgoto no Lago Paranoá.",
  applicationName: "Escoamentos Paranoá",
  appleWebApp: {
    capable: true,
    title: "Escoamentos",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b6e86",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
