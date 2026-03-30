import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      character: string;
      avatar: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    character: string;
    avatar: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    character?: string;
    avatar?: string;
  }
}
