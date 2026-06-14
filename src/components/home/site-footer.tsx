import {
  getFooterLinks,
  getSocialLinks,
} from "@/components/home/data";
import { BrandLockup } from "@/components/home/brand-lockup";
import type { AppLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: AppLocale }) {
  const footerLinks = getFooterLinks(locale);
  const socialLinks = getSocialLinks(locale);

  return (
    <footer className="home-footer">
      <div className="home-footer-brand">
        <BrandLockup compact />
        <p>
          {t(locale, "home.footerCopyLine1")}
          <br />
          {t(locale, "home.footerCopyLine2")}
        </p>
      </div>

      <nav className="home-footer-links" aria-label={t(locale, "home.footerNavAria")}>
        {footerLinks.map((link) => (
          <a href="#top" key={link}>
            {link}
          </a>
        ))}
      </nav>

      <div className="home-footer-social" aria-label={t(locale, "home.footerSocialAria")}>
        {socialLinks.map((social) => {
          const Icon = social.icon;

          return (
            <a href="#top" key={social.label} aria-label={social.label}>
              <Icon className="size-6" aria-hidden="true" />
            </a>
          );
        })}
      </div>

      <p className="home-footer-copy">
        © 2026 Raid Reminder
        <br />
        {t(locale, "home.footerRights")}
      </p>
    </footer>
  );
}
