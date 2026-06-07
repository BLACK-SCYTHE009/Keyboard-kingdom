import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import SettingsProvider from "@/components/SettingsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keyboard Kingdom",
  description: "A multiplayer typing RPG where every word is an attack.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="h-screen w-screen overflow-hidden bg-[#0d1117] font-sans text-white antialiased">
          <SettingsProvider>{children}</SettingsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
