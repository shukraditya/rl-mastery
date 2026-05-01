'use client';

import { signIn } from "next-auth/react";

interface SignInButtonProps {
  className?: string;
  children: React.ReactNode;
}

export default function SignInButton({ className, children }: SignInButtonProps) {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className={className}
    >
      {children}
    </button>
  );
}
