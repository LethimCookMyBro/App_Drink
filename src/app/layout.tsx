import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { headers } from "next/headers";
import { SecurityNonceProvider } from "@/frontend/components/SecurityNonceProvider";
import { ThemeProvider } from "@/frontend/components/ThemeProvider";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wongtaek.app"),
  title: "วงแตก - เกมวงเหล้าเพื่อนสนิท",
  description:
    "Web App เกมวงเหล้า สำหรับกลุ่มเพื่อนผู้ชาย เล่นกันจริงในวงเหล้า",
  keywords: [
    "drinking game",
    "party game",
    "วงเหล้า",
    "เกมดื่ม",
    "truth or dare",
  ],
  authors: [{ name: "Wong Taek Team" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "วงแตก - เกมวงเหล้าเพื่อนสนิท",
    description: "Web App เกมวงเหล้า สำหรับกลุ่มเพื่อนผู้ชาย เล่นกันจริงในวงเหล้า",
    type: "website",
    locale: "th_TH",
    siteName: "วงแตก",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e1022",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce");

  return (
    <html
      lang="th"
      className="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head />
      <body
        className={`${kanit.variable} font-[family-name:var(--font-kanit)] antialiased`}
        suppressHydrationWarning
      >
        <SecurityNonceProvider nonce={nonce}>
          <ThemeProvider>
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="smoke-bg absolute top-[-10%] left-0 right-0 h-[70vh] w-full" />
              <div className="absolute bottom-[-20%] left-[-20%] h-[50vh] w-[80%] rounded-full bg-primary/5 blur-[80px]" />
              <div className="noise-overlay absolute inset-0" />
            </div>

            {/* Main Content */}
            <div className="app-shell">{children}</div>
          </ThemeProvider>
        </SecurityNonceProvider>
      </body>
    </html>
  );
}
