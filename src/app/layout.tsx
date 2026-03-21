import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

const pressStart = Press_Start_2P({ 
  weight: '400', 
  subsets: ["latin"], 
  variable: "--font-pixel" 
});

export const metadata: Metadata = {
  title: "Nature Typing RPG",
  description: "A multiplayer typing RPG with a blocky aesthetic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} antialiased bg-[#87CEEB] text-white font-pixel h-screen w-screen overflow-hidden`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
