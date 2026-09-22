import { notFound } from "next/navigation";
import { getClassDetail } from "@/db/queries";
import { ClassDetailScreen } from "@/components/ClassDetailScreen";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getClassDetail(id);
  if (!data) notFound();

  return <ClassDetailScreen data={data} />;
}
