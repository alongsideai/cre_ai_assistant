import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface LayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default async function LeaseLayout({ children, params }: LayoutProps) {
  const lease = await prisma.lease.findUnique({
    where: { id: params.id },
    include: {
      property: true,
    },
  });

  if (!lease) {
    notFound();
  }

  const currentPath = `/leases/${params.id}`;

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lease.tenantName}</h1>
            <p className="text-gray-600 mt-1">
              {lease.property.name} • {lease.suite || 'No suite'}
            </p>
          </div>
          <div className="space-x-2">
            <Link
              href="/properties"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Properties
            </Link>
            <Link
              href="/dashboard"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200 rounded-t-lg">
          <nav className="flex gap-8 px-6">
            <TabLink href={`${currentPath}/overview`} label="Overview" />
            <TabLink href={`${currentPath}/documents`} label="Documents" />
            <TabLink href={`${currentPath}/critical-dates`} label="Critical Dates" />
            <TabLink href={`${currentPath}/qa`} label="Q&A" />
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg min-h-[400px]">
          {children}
        </div>
      </div>
    </main>
  );
}

function TabLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block py-4 px-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
    >
      {label}
    </Link>
  );
}
