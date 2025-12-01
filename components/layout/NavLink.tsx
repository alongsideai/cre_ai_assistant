'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}

export default function NavLink({ href, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();

  // Determine if link is active
  let isActive: boolean;

  if (exact) {
    // Exact match only
    isActive = pathname === href;
  } else if (href === '/maintenance') {
    // Special case: /maintenance should match /maintenance and /maintenance/work-orders/*
    // but NOT /maintenance/automation (which has its own nav item)
    isActive =
      pathname === '/maintenance' ||
      (pathname.startsWith('/maintenance/') && !pathname.startsWith('/maintenance/automation'));
  } else {
    // Default prefix matching
    isActive = pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-gray-900 text-white font-medium'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}
