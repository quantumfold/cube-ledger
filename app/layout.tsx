import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cube Ledger",
  description: "Track Magic: The Gathering Cube draft results, money, and playgroup stats."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link className="brand" href="/">
              <span className="brand-mark"><BarChart3 size={18} /></span>
              <span>Cube Ledger</span>
            </Link>
            <nav className="nav" aria-label="Main navigation">
              <Link href="/">Dashboard</Link>
              <Link href="/drafts">Draft History</Link>
              <Link href="/new-draft">New Draft</Link>
              <Link href="/players/p1">Player Profile</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
