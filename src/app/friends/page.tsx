import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function FriendsPage() {
    const session = await getServerSession();
    if (!session || !session.user?.name) return <div className="p-8 text-white">Unauthorized</div>;

    const me = await prisma.user.findUnique({ 
        where: { username: session.user.name },
        include: { 
            friendsInitiated: { include: { friend: true } }, 
            friendsReceived: { include: { user: true } } 
        }
    });

    if (!me) return <div>User not found in DB</div>;

    const friends = [
        ...me.friendsInitiated.map((f: any) => f.friend),
        ...me.friendsReceived.map((f: any) => f.user)
    ];

    async function addFriend(formData: FormData) {
        "use server"
        const session = await getServerSession();
        if(!session?.user?.name) return;

        const targetUsername = formData.get("username") as string;
        
        const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
        const meUser = await prisma.user.findUnique({ where: { username: session.user.name } });

        if (targetUser && meUser && targetUser.id !== meUser.id) {
            try {
                await prisma.friend.create({
                    data: {
                        userId: meUser.id,
                        friendId: targetUser.id,
                        status: "ACCEPTED" // Auto accept for simplicity
                    }
                });
            } catch(e) {
                // likely already friends
            }
        }
        revalidatePath("/friends");
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center bg-[#87CEEB] z-50 p-8 overflow-y-auto">
            <div className="flex w-full max-w-2xl justify-between mb-8">
                <h1 className="text-3xl text-[#8B5A2B] drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] blocky-border bg-[#55AA55] p-4 text-center">
                    FRIEND LIST
                </h1>
                <Link href="/">
                    <button className="mc-btn blocky-border bg-red-500 text-white p-4 h-full">BACK TO HUB</button>
                </Link>
            </div>

            <div className="flex flex-col gap-8 w-full max-w-2xl">
                
                {/* Add Friend Box */}
                <div className="bg-mc-stone/90 blocky-border p-6 flex flex-col gap-4">
                    <h3 className="text-yellow-400">ADD A FRIEND</h3>
                    <form action={addFriend} className="flex gap-4">
                        <input 
                            name="username" 
                            type="text" 
                            placeholder="Enter exact Username..." 
                            className="flex-1 bg-black text-white p-4 blocky-border-inner focus:outline-none text-xs"
                            required
                        />
                        <button type="submit" className="mc-btn bg-blue-500 text-white p-4 text-xs">SEND REQUEST</button>
                    </form>
                </div>

                {/* Friends List Box */}
                <div className="bg-mc-stone/90 blocky-border p-6 flex flex-col gap-4 min-h-[300px]">
                    <h3 className="text-[#39FF14]">YOUR FRIENDS ({friends.length})</h3>
                    <div className="flex flex-col gap-2">
                        {friends.length === 0 ? (
                            <div className="text-gray-400 text-xs">No friends yet. It's dangerous to go alone!</div>
                        ) : (
                            friends.map((f: any) => (
                                <div key={f.id} className="bg-black/80 blocky-border-inner p-4 flex justify-between items-center text-xs text-white">
                                    <span className="text-yellow-400">❖ {f.username}</span>
                                    <span className="text-gray-400">LVL {f.level}</span>
                                    <button className="mc-btn bg-[#55AA55] text-[8px] p-2">MESSAGE</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
