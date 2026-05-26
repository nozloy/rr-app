import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
  href?: string;
  markClassName?: string;
  textClassName?: string;
};

export function BrandLockup({
  className,
  compact = false,
  href = "#top",
  markClassName,
  textClassName,
}: BrandLockupProps) {
  return (
    <Link
      className={cn("home-brand", className)}
      href={href}
      aria-label="RaidReminder"
    >
      <span className={cn("home-brand-mark", markClassName)} aria-hidden="true">
        <Image
          src="/home/raid-reminder-mark.png"
          alt=""
          width={58}
          height={58}
          priority={!compact}
        />
      </span>
      <span className={cn("home-brand-text", textClassName)}>
        <span>Raid</span>
        <span>Reminder</span>
      </span>
    </Link>
  );
}
