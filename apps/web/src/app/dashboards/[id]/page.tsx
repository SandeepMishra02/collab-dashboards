import DashboardEditor from '@/components/DashboardEditor';

type Props = {
  params: { id: string };
};

export const dynamic = 'force-dynamic';

export default async function DashboardDetail({ params }: Props) {
  // In App Router, params is already awaited
  const id = Number(params.id);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Dashboard #{id}</h1>
      {/* Pass initial id only;
          the editor fetches data client-side and
          renders safely even while loading */}
      <DashboardEditor dashId={id} />
    </main>
  );
}






