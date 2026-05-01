import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";
import "katex/dist/katex.min.css";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButton from "@/components/AuthButton";

export const metadata: Metadata = {
  title: "RL Mastery",
  description: "8 weeks. 56 days. Build deep intuition for reinforcement learning.",
};

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionProvider>
          <header className="app-header">
            <nav className="app-nav">
              <a href="/" className="nav-brand">RL Mastery</a>
              <div className="nav-links">
                {isAuthed && (
                  <>
                    <a href="/" className="nav-link">Dashboard</a>
                    <a href="/progress" className="nav-link">Progress</a>
                  </>
                )}
              </div>
              <div className="nav-actions">
                <ThemeToggle />
                <AuthButton />
              </div>
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
