import { getServerSession } from "next-auth";
import LoginScreen from "@/components/LoginScreen";
import MainMenu from "@/components/MainMenu";

export default async function Home() {
  // Use generic session approach; next-auth config defaults verify user
  const session = await getServerSession();

  if (!session) {
    return <LoginScreen />;
  }

  // Pass session so MainMenu knows the user
  return <MainMenu session={session} />;
}
