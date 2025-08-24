import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Collaborative Dashboards" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <header className="sticky top-0 z-10 bg-slate-900/70 backdrop-blur border-b border-slate-800">
          <nav className="max-w-6xl mx-auto flex items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold text-sky-300">Collab Dashboards</Link>
            <div className="flex gap-3 text-slate-300">
              <Link href="/datasets" className="hover:text-white">Datasets</Link>
              <Link href="/queries"  className="hover:text-white">Queries</Link>
              <Link href="/dashboards" className="hover:text-white">Dashboards</Link>
            </div>
          </nav>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-slate-400">
          Built with Next.js · FastAPI · DuckDB · WebSockets
        </footer>
      </body>
    </html>
  );
}


