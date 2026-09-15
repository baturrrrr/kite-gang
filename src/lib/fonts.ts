import { Barlow_Condensed, Manrope } from "next/font/google";

// Başlıklar ve büyük rakamlar: dar, kalın, büyük harf
export const headingFont = Barlow_Condensed({
  variable: "--font-heading-display",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
});

export const bodyFont = Manrope({
  variable: "--font-sans-body",
  subsets: ["latin", "latin-ext"],
});
