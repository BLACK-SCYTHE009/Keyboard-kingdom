import { auth } from "@clerk/nextjs/server";
import { getUserProfile } from "@/lib/profiles";
import GameClient from "@/components/GameClient";
import { redirect } from "next/navigation";

export default async function RandomLobbyPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect("/");
    }

    const dbUser = await getUserProfile(userId);

    if (!dbUser) {
        redirect("/");
    }

    return <GameClient mode="random" username={dbUser.username} userId={userId} character={dbUser.character || "heroA"} />;
}
