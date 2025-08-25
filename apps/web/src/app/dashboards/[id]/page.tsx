import DashboardEditor from "@/components/DashboardEditor";
import { API_URL } from "@/lib/api";

type Props = { params: { id: string } };

async function warm(dashId: number) {
  try {
    await fetch(`${API_URL}/dashboards/${dashId}`, { cache: "no-store" });
  } catch {
    // don’t crash the page if API is temporarily unavailable
  }
}

export default async function DashboardDetail({ params }: Props) {
  const dashId = Number(params.id);
  await warm(dashId); // optional prefetch, safe now
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard #{dashId}</h1>
      <DashboardEditor dashId={dashId} />
    </main>
  );
}












