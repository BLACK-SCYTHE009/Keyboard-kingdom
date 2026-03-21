import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginScreen from "@/components/LoginScreen";
import MainMenu from "@/components/MainMenu";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LoginScreen />;
  }

  return <MainMenu session={session} />;
}
