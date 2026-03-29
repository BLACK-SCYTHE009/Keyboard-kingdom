import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      character: string;
      avatar: string;
    } & DefaultSession["user"]
  }
}
