import { footerLinks, socialLinks } from "@/components/home/data";
import { BrandLockup } from "@/components/home/brand-lockup";

export function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-brand">
        <BrandLockup compact />
        <p>
          Планируйте идеальные рейды, ключи и фарм.
          <br />
          Мы берем хаос на себя.
        </p>
      </div>

      <nav className="home-footer-links" aria-label="Дополнительная навигация">
        {footerLinks.map((link) => (
          <a href="#top" key={link}>
            {link}
          </a>
        ))}
      </nav>

      <div className="home-footer-social" aria-label="Социальные каналы">
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
        Все права защищены
      </p>
    </footer>
  );
}
