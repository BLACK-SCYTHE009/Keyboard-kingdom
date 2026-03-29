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
                        status: "ACCEPTED"
                    }
                });
            } catch(e) {
                // likely already friends
            }
        }
        revalidatePath("/friends");
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center bg-kingdom z-50 p-8 overflow-y-auto">
            <div className="flex w-full max-w-2xl justify-between mb-8 items-center">
                <h1 className="scale-in text-2xl md:text-3xl text-gold text-glow-gold blocky-border bg-gradient-to-b from-[#2d5a1e] to-[#1a3a10] p-4 text-center">
                    👥 FRIENDS
                </h1>
                <Link href="/">
                    <button className="mc-btn blocky-border bg-red-700 text-white p-4 h-full text-[10px]">← BACK TO HUB</button>
                </Link>
            </div>

            <div className="flex flex-col gap-8 w-full max-w-2xl">
                
                {/* Add Friend Box */}
                <div className="fade-in-up bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm blocky-border p-6 flex flex-col gap-4"
                     style={{ '--delay': '0.2s' } as React.CSSProperties}>
                    <h3 className="text-yellow-400 text-xs text-glow-gold">➕ ADD A FRIEND</h3>
                    <form action={addFriend} className="flex gap-4">
                        <input 
                            name="username" 
                            type="text" 
                            placeholder="Enter exact Username..." 
                            className="flex-1 bg-black/80 text-white p-4 blocky-border-inner text-xs transition-all duration-300"
                            required
                        />
                        <button type="submit" className="mc-btn bg-gradient-to-b from-blue-500 to-blue-700 text-white p-4 text-xs">📨 SEND</button>
                    </form>
                </div>

                {/* Friends List Box */}
                <div className="fade-in-up bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm blocky-border p-6 flex flex-col gap-4 min-h-[300px]"
                     style={{ '--delay': '0.4s' } as React.CSSProperties}>
                    <h3 className="text-[#39FF14] text-xs" style={{ textShadow: '0 0 8px rgba(57,255,20,0.4)' }}>
                        ⚔️ YOUR PARTY ({friends.length})
                    </h3>
                    <div className="flex flex-col gap-2">
                        {friends.length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <div className="text-3xl bounce">⚔️</div>
                                <div className="text-gray-400 text-[10px] text-center">
                                    No allies yet. It&apos;s dangerous to go alone!
                                </div>
                                <div className="text-[8px] text-gray-600">Add a friend above to start your party</div>
                            </div>
                        ) : (
                            friends.map((f: any, i: number) => (
                                <div key={f.id}
                                     className="fade-in-up bg-black/60 blocky-border-inner p-4 flex justify-between items-center text-xs text-white card-hover"
                                     style={{ '--delay': `${0.5 + i * 0.1}s` } as React.CSSProperties}>
                                    <span className="text-yellow-400 text-glow-gold">❖ {f.username}</span>
                                    <span className="text-gray-400">LVL {f.level}</span>
                                    <button className="mc-btn bg-gradient-to-b from-[#55AA55] to-[#3E8E3E] text-[8px] p-2">💬 MSG</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
