import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Cinzel_Decorative, Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/common/ServiceWorkerRegistrar";
import { withBasePath } from "@/lib/common/publicPath";

// ═══ Typeface system (v8 sunrise redesign) ═══
// - Fraunces: serif display, warm/organic, for hero titles & daily quote.
// - Inter:    grotesque sans, for UI/buttons/HUD/timers.
// - JetBrains Mono: for codes, numbers, tracking data.
// - Cinzel Decorative: kept TEMPORARILY for the remaining dōjō screens
//   (mission / summary); will be retired in Sprint 2 when those are reskinned.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});
// Bricolage Grotesque: humanist sans, variable weight + width axis.
// Used for editorial display titles in the redesigned Welcome screen.
// Closest free analog to Adobe Antique Olive (referenced by poppr.be).
const bricolage = Bricolage_Grotesque({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});
const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Morning Awakening",
  description: "Protocolo matutino Génesis: 13 fases guiadas. Claridad, cuerpo, enfoque.",
  manifest: withBasePath("/manifest.json"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Awakening",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0614",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} ${cinzelDecorative.variable} ${bricolage.variable} h-full`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iPad / iOS Safari cache busting — prevent stale HTML shell */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="icon" type="image/png" href={withBasePath("/icono.png")} />
        <link rel="shortcut icon" href={withBasePath("/icono.png")} />
        <link rel="apple-touch-icon" href={withBasePath("/icono.png")} />
      </head>
      <body className="h-full overflow-hidden bg-background font-[family-name:var(--font-cinzel)]">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
