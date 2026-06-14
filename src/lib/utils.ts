import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatItemLevel(itemLevel: number | null | undefined) {
  if (!Number.isFinite(itemLevel) || !itemLevel || itemLevel <= 0) {
    return "н/д"
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Math.round(itemLevel))
}

export function toBattleNetSlug(value: string | null | undefined) {
  if (!value) {
    return ""
  }

  return value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
