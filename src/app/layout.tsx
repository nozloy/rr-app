import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/home/site-footer";
import { LocaleProvider } from "@/components/shell/locale-provider";
import { getRequestLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={cn("font-sans", jetbrainsMono.variable)}>
      <body>
        <LocaleProvider locale={locale}>
          <div className="site-shell">
            <div className="site-shell-content">{children}</div>
            <SiteFooter locale={locale} />
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
