import { getTodayData } from "@/db/queries";
import { TodayScreen } from "@/components/TodayScreen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const classes = await getTodayData();
  return <TodayScreen classes={classes} />;
}
