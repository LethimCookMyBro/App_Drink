import type { Metadata, Viewport } from "next";
import { Kanit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e1022",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${kanit.variable} ${spaceGrotesk.variable} font-[family-name:var(--font-kanit)] antialiased`}
      >
        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="smoke-bg absolute top-[-10%] left-0 right-0 h-[70vh] w-full" />
          <div className="absolute bottom-[-20%] left-[-20%] h-[50vh] w-[80%] rounded-full bg-primary/5 blur-[80px]" />
          <div className="noise-overlay absolute inset-0" />
        </div>

        {/* Main Content */}
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
