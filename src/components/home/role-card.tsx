import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { RoleRequirement } from "@/components/home/data";

type RoleCardProps = {
  role: RoleRequirement;
};

export function RoleCard({ role }: RoleCardProps) {
  const Icon = role.icon;

  return (
    <button className="home-role-card" data-tone={role.tone} type="button">
      <span className="home-role-icon" aria-hidden="true">
        <Image src={role.imagePath} alt="" width={32} height={32} />
      </span>
      <span className="home-role-copy">
        <span>{role.label}</span>
        <strong>{role.value}</strong>
      </span>
      <Icon className="home-role-fallback size-5" aria-hidden="true" />
      <ChevronRight className="size-4 opacity-60" aria-hidden="true" />
    </button>
  );
}
