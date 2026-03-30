import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import GameClient from "@/components/GameClient";
import { redirect } from "next/navigation";

export default async function SinglePlayerPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.name) {
        redirect("/");
    }

    return <GameClient mode="singleplayer" username={session.user.name} character={session.user.character || "heroA"} />;
}
