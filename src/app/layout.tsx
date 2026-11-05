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
  title: "EcoParanoá | Monitoramento e Preservação do Lago Paranoá",
  description:
    "Ajude a cuidar do Lago Paranoá identificando e mapeando pontos de despejos e escoamentos clandestinos ou regulares com foto e geolocalização.",
  applicationName: "EcoParanoá",
  appleWebApp: {
    capable: true,
    title: "EcoParanoá",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png", sizes: "180x180" }],
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
