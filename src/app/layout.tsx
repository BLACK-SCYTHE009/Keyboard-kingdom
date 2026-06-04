import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Press_Start_2P } from "next/font/google";
import SettingsProvider from "@/components/SettingsProvider";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Keyboard Kingdom",
  description: "A multiplayer typing RPG where every word is an attack.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${pressStart.variable} ${inter.variable} h-screen w-screen overflow-hidden bg-[#0d1117] font-pixel text-white antialiased`}>
          <SettingsProvider>{children}</SettingsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
