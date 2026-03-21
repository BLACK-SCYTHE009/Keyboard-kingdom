import { getServerSession } from "next-auth";
import GameClient from "@/components/GameClient";

export default async function SinglePlayerPage() {
    const session = await getServerSession();
    if (!session || !session.user?.name) {
        return <div className="p-8 text-red-500 font-pixel">UNAUTHORIZED. PLEASE LOGIN.</div>;
    }

    return <GameClient mode="singleplayer" username={session.user.name} />;
}
