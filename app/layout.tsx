import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDR — профессиональные дроны",
  description: "Десять профессиональных систем MDR и интерактивный конфигуратор.",
  openGraph: {
    title: "MDR — 10 дронов",
    description: "Соберите систему под свою миссию.",
    images: ["/assets/mdr-og-v1.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "MDR — 10 дронов",
    description: "360° · цвет · комплектация",
    images: ["/assets/mdr-og-v1.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
