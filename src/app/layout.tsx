import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaidReminder",
  description: "Личный кабинет Mythic+ для World of Warcraft и генератор баннеров.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
