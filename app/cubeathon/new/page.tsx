import { CubeathonEntryForm } from "@/components/cubeathon/CubeathonEntryForm";
import { getPlayers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewCubeathonPage() {
  const players = await getPlayers();
  return <CubeathonEntryForm players={players} />;
}
