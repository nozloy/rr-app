import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaidReminder",
  description: "Личный кабинет Mythic+ для World of Warcraft и генератор баннеров.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
