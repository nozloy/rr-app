import Image from "next/image";

export function DarkmoonHeader() {
  return (
    <header className="darkmoon-header relative z-10 mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-2 mix-blend-screen sm:gap-8 sm:px-8 sm:py-3">
      <a href="#prediction" className="block size-20 shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 sm:size-28 lg:size-36" aria-label="Ярмарка Новолуния — к предсказанию">
        <Image src="/kogda-raid/darkmoon-logo-minimal.png" alt="Ярмарка Новолуния" width={1254} height={1254} priority sizes="(min-width: 1024px) 144px, (min-width: 640px) 112px, 80px" className="size-full object-contain" />
      </a>
      <h1 className="darkmoon-title min-w-0 flex-1 whitespace-nowrap text-center font-serif text-[clamp(1.25rem,5.6vw,5.5rem)] font-bold leading-tight tracking-tight">Будет ли рейд?</h1>
    </header>
  );
}
