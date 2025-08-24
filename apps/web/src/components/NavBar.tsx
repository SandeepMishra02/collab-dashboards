"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const path = usePathname() || "/";

  const isActive = (href: string) =>
    path === href || (href !== "/" && path.startsWith(href));

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand">Collab Dashboards</Link>
        <nav className="nav">
          <Link href="/" className={isActive("/") ? "active" : ""}>Home</Link>
          <Link href="/datasets" className={isActive("/datasets") ? "active" : ""}>Datasets</Link>
          <Link href="/queries" className={isActive("/queries") ? "active" : ""}>Queries</Link>
          <Link href="/dashboards" className={isActive("/dashboards") ? "active" : ""}>Dashboards</Link>
        </nav>
      </div>
    </header>
  );
}
