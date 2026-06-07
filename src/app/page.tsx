import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkUserToProfileInput, getOrCreateUserProfile, getProfileStoreErrorMessage, isProfileStoreError } from "@/lib/profiles";
import DatabaseSetupScreen from "@/components/DatabaseSetupScreen";
import LoginScreen from "@/components/LoginScreen";
import MainMenu from "@/components/MainMenu";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return <LoginScreen />;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return <LoginScreen />;

  let profile;
  try {
    profile = await getOrCreateUserProfile(userId, clerkUserToProfileInput(clerkUser));
  } catch (error) {
    if (!isProfileStoreError(error)) throw error;
    console.error("Profile store error:", error);
    return <DatabaseSetupScreen message={getProfileStoreErrorMessage(error)} />;
  }

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
