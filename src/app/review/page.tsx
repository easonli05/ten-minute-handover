import { getReviewData } from "@/db/queries";
import { ReviewScreen } from "@/components/ReviewScreen";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const data = await getReviewData();
  return <ReviewScreen data={data} />;
}
