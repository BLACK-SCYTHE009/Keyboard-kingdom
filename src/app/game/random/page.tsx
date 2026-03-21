import { getServerSession } from "next-auth";
import GameClient from "@/components/GameClient";

export default async function RandomLobbyPage() {
    // Basic verification that user is signed in
    const session = await getServerSession();
    if (!session || !session.user?.name) {
        return <div className="p-8 text-red-500 font-pixel">UNAUTHORIZED. PLEASE LOGIN.</div>;
    }

    return <GameClient mode="random" username={session.user.name} />;
}
