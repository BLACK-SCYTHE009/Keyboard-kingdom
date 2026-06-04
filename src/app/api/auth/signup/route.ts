import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { upsertUserProfile } from "@/lib/profiles";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const username = String(body.username || "").trim();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const profile = await upsertUserProfile(userId, {
      username,
      displayName: body.displayName,
      age: body.age,
      gender: body.gender,
      bio: body.bio,
      profilePicture: body.profilePicture,
      character: body.character,
      avatar: body.avatar,
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Profile upsert error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
