import type { Metadata, Viewport } from "next";
import { Outfit, Cinzel_Decorative } from "next/font/google";
import "./globals.css";

// Outfit — body / descriptions (reuses the legacy --font-jetbrains variable
// name so existing component references keep working without churn).
const outfit = Outfit({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

// Cinzel Decorative — titles / ceremonial headings.
const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "MORNING AWAKENING — 道場",
  description: "Protocolo matutino del operador. Disciplina. Enfoque. Energía.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AWAKENING",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0908",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${outfit.variable} ${cinzelDecorative.variable} h-full`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full overflow-hidden bg-background font-[family-name:var(--font-jetbrains)]">
        {children}
      </body>
    </html>
  );
}
