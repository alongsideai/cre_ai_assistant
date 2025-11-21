import Link from 'next/link';
import RentRollUpload from '@/components/RentRollUpload';
import LeasePdfUpload from '@/components/LeasePdfUpload';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">CRE Lease Assistant</h1>
        <p className="text-gray-600 mb-8">
          Upload rent rolls and lease documents to start analyzing your commercial real estate portfolio.
        </p>

        <div className="space-y-8">
          {/* Rent Roll Upload Section */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Upload Rent Roll CSV</h2>
            <p className="text-sm text-gray-600 mb-4">
              Expected columns: property_name, address, tenant_name, suite, square_feet, base_rent, lease_start, lease_end
            </p>
            <RentRollUpload />
          </section>

          {/* Lease PDF Upload Section */}
          <section className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Upload Lease PDF</h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload a PDF lease document for a specific lease in your portfolio.
            </p>
            <LeasePdfUpload />
          </section>

          {/* Navigation */}
          <section className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold mb-4">View Portfolio</h2>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                View Portfolio Dashboard
              </Link>
              <Link
                href="/properties"
                className="inline-block bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                View Properties & Leases
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
