'use client';

import Link from 'next/link';
import NavLink from './NavLink';

export default function AppHeader() {
  return (
    <header className="border-b border-gray-200 bg-white h-14 flex items-center justify-between px-6">
      <Link
        href="/dashboard"
        className="font-semibold text-lg text-gray-900 hover:opacity-80 transition-opacity"
      >
        MagnetAI
      </Link>
      <nav className="flex items-center gap-1">
        <NavLink href="/dashboard" exact>
          Home
        </NavLink>
        <NavLink href="/maintenance">
          Maintenance
        </NavLink>
        <NavLink href="/maintenance/automation" exact>
          Automation
        </NavLink>
      </nav>
    </header>
  );
}
