import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkUserToProfileInput, getOrCreateUserProfile } from "@/lib/profiles";
import LoginScreen from "@/components/LoginScreen";
import MainMenu from "@/components/MainMenu";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return <LoginScreen />;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return <LoginScreen />;

  const profile = await getOrCreateUserProfile(userId, clerkUserToProfileInput(clerkUser));

  const session = {
    user: {
      id: profile.id,
      name: profile.username,
      character: profile.character,
      avatar: profile.avatar,
      displayName: profile.displayName,
      gender: profile.gender,
      profilePicture: profile.profilePicture,
      level: profile.level,
      xp: profile.xp,
    },
  };

  return <MainMenu session={session} />;
}
