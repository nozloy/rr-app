"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type LoginButtonProps = Omit<ButtonProps, "children" | "onClick" | "type"> & {
  disabled?: boolean;
};

export function LoginButton({
  disabled = false,
  size = "lg",
  variant,
  ...props
}: LoginButtonProps) {
  return (
    <Button
      disabled={disabled}
      onClick={() => signIn("battlenet", { callbackUrl: "/dashboard" })}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      <LogIn className="size-4" aria-hidden="true" />
      Войти через Battle.net
    </Button>
  );
}
