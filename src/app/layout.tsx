import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import SettingsProvider from "@/components/SettingsProvider";

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ["latin"],
  variable: "--font-pixel"
});

export const metadata: Metadata = {
  title: "Keyboard Kingdom",
  description: "A multiplayer typing RPG — type to conquer, fight to survive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} antialiased bg-[#0d1117] text-white font-pixel h-screen w-screen overflow-hidden`}>
        <AuthProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
