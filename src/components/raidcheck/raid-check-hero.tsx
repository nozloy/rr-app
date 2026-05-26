import Image from "next/image";

export function RaidCheckHero() {
  return (
    <section className="raidcheck-hero" aria-labelledby="raidcheck-title">
      <Image
        src="/home/hero-midnight-citadel.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="raidcheck-hero-bg"
      />
      <div className="raidcheck-hero-overlay" aria-hidden="true" />

      <div className="raidcheck-hero-content">
        <div className="eyebrow">Raid lockout intelligence</div>
        <h1 id="raidcheck-title">Проверка кд рейда</h1>
        <p>
          Вставьте строку из аддона, выберите сложность и проверьте весь состав
          перед стартом. RaidReminder покажет, кто уже убивал боссов на этой
          неделе.
        </p>
      </div>
    </section>
  );
}
