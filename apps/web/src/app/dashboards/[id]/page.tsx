import DashboardEditor from "@/components/DashboardEditor";

export const dynamic = "force-dynamic";

export default async function DashboardDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dashId = Number(id);

  // warm the API (optional)
  await fetch(`${process.env.NEXT_PUBLIC_API_URL}/dashboards/${dashId}`, { cache: "no-store" });

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard #{dashId}</h1>
      <DashboardEditor dashId={dashId} />
    </main>
  );
}











