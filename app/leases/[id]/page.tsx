import { redirect } from 'next/navigation';

interface PageProps {
  params: {
    id: string;
  };
}

export default function LeasePage({ params }: PageProps) {
  redirect(`/leases/${params.id}/overview`);
}
