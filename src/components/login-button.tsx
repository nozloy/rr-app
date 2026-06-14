"use client";

import { signIn } from "next-auth/react";
import { Button, type ButtonProps } from "@/components/ui/button";

type LoginButtonProps = Omit<ButtonProps, "children" | "onClick" | "type"> & {
  disabled?: boolean;
  label?: string;
};

export function LoginButton({
  disabled = false,
  label = "Войти через Battle.net",
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
      <span className="battle-net-login-icon" aria-hidden="true" />
      {label}
    </Button>
  );
}
