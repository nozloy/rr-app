"use client";

import { signOut } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";

type LogoutButtonProps = Omit<ButtonProps, "onClick" | "type">;

export function LogoutButton({
  children,
  size,
  variant = "outline",
  ...props
}: LogoutButtonProps) {
  return (
    <Button
      onClick={() => signOut({ callbackUrl: "/" })}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children ?? "Выйти"}
    </Button>
  );
}
