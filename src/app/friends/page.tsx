import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import DatabaseSetupScreen from "@/components/DatabaseSetupScreen";
import { addAcceptedFriend, getProfileStoreErrorMessage, isProfileStoreError, listFriends } from "@/lib/profiles";

export default async function FriendsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  let friends;
  try {
    friends = await listFriends(userId);
  } catch (error) {
    if (!isProfileStoreError(error)) throw error;
    console.error("Friends store error:", error);
    return <DatabaseSetupScreen message={getProfileStoreErrorMessage(error)} />;
  }

  async function addFriend(formData: FormData) {
    "use server";

    const { userId: currentUserId } = await auth();
    if (!currentUserId) return;

    const targetUsername = String(formData.get("username") || "");
    await addAcceptedFriend(currentUserId, targetUsername);
    revalidatePath("/friends");
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center overflow-y-auto bg-kingdom p-6 text-white">
      <div className="mb-8 flex w-full max-w-2xl items-center justify-between gap-4">
        <h1 className="scale-in blocky-border bg-gradient-to-b from-[#2d5a1e] to-[#1a3a10] p-4 text-center text-2xl text-gold text-glow-gold md:text-3xl">
          FRIENDS
        </h1>
        <Link href="/">
          <button className="mc-btn blocky-border bg-red-700 p-4 text-[10px] text-white">BACK TO HUB</button>
        </Link>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div
          className="fade-in-up blocky-border flex flex-col gap-4 bg-gradient-to-b from-gray-800/90 to-gray-900/90 p-6 backdrop-blur-sm"
          style={{ "--delay": "0.2s" } as React.CSSProperties}
        >
          <h3 className="text-xs text-yellow-400 text-glow-gold">ADD A FRIEND</h3>
          <form action={addFriend} className="flex gap-4">
            <input
              name="username"
              type="text"
              placeholder="Enter exact username..."
              className="blocky-border-inner flex-1 bg-black/80 p-4 text-xs text-white transition-all duration-300"
              required
            />
            <button type="submit" className="mc-btn bg-gradient-to-b from-blue-500 to-blue-700 p-4 text-xs text-white">
              ADD
            </button>
          </form>
        </div>

        <div
          className="fade-in-up blocky-border flex min-h-[300px] flex-col gap-4 bg-gradient-to-b from-gray-800/90 to-gray-900/90 p-6 backdrop-blur-sm"
          style={{ "--delay": "0.4s" } as React.CSSProperties}
        >
          <h3 className="text-xs text-[#39FF14]" style={{ textShadow: "0 0 8px rgba(57,255,20,0.4)" }}>
            YOUR PARTY ({friends.length})
          </h3>
          <div className="flex flex-col gap-2">
            {friends.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="text-center text-[10px] text-gray-400">No allies yet. Add a friend above to start your party.</div>
              </div>
            ) : (
              friends.map((friend, index) => (
                <div
                  key={friend.id}
                  className="fade-in-up card-hover blocky-border-inner flex items-center justify-between bg-black/60 p-4 text-xs text-white"
                  style={{ "--delay": `${0.5 + index * 0.1}s` } as React.CSSProperties}
                >
                  <span className="text-yellow-400 text-glow-gold">{friend.displayName || friend.username}</span>
                  <span className="text-gray-400">LVL {friend.level}</span>
                  <button className="mc-btn bg-gradient-to-b from-[#55AA55] to-[#3E8E3E] p-2 text-[8px]">MSG</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
