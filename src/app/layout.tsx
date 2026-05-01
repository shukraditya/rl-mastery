import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "RL Mastery Quiz",
  description: "Daily quizzes for the RL Mastery curriculum",
};

const themeScript = `
  (function() {
    const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="app-header">
          <nav className="app-nav">
            <a href="/" className="nav-brand">RL Mastery</a>
            <div className="nav-links">
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/progress" className="nav-link">Progress</a>
            </div>
            <ThemeToggle />
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
