import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { headingFont, bodyFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: {
    default: "Kite Gang Corner",
    template: "%s · Kite Gang Corner",
  },
  description: "Kitesurf okulu rezervasyon ve yönetim platformu",
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`dark ${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background">
        {children}
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
