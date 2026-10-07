import Image from "next/image";
import type { AppLocale } from "@/lib/i18n";
import { getWorkshopCopy } from "@/components/home/workshop-copy";

export function HeroSection({ locale }: { locale: AppLocale }) {
  const copy = getWorkshopCopy(locale);

  return (
    <section className="workshop-hero" aria-labelledby="home-hero-title">
      <h1 id="home-hero-title">
        <span className="sr-only">{copy.title}</span>
        <Image
          src="/home/workshop/title-sign.webp"
          alt=""
          width={1690}
          height={931}
          priority
          unoptimized
          className="h-auto w-full"
          aria-hidden="true"
        />
      </h1>
      <p className="workshop-tagline">{copy.tagline}</p>
    </section>
  );
}
