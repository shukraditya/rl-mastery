'use client';

import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="auth-btn">...</span>;
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
        className="auth-btn"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="auth-btn"
    >
      Sign in
    </button>
  );
}
