import type { User } from "@clerk/nextjs/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  displayName: string;
  age: number | null;
  gender: string;
  bio: string;
  profilePicture: string;
  character: string;
  avatar: string;
  level: number;
  xp: number;
  createdAt: string;
};

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  profile_picture: string | null;
  character: string | null;
  avatar: string | null;
  level: number | null;
  xp: number | null;
  created_at: string;
};

export type ProfileInput = {
  username: string;
  displayName?: string;
  age?: number | string | null;
  gender?: string;
  bio?: string;
  profilePicture?: string;
  character?: string;
  avatar?: string;
};

export type FriendProfile = Pick<UserProfile, "id" | "username" | "displayName" | "level" | "avatar">;

function normalizeUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    age: row.age,
    gender: row.gender || "other",
    bio: row.bio || "",
    profilePicture: row.profile_picture || "",
    character: row.character || "heroA",
    avatar: row.avatar || "1",
    level: row.level || 1,
    xp: row.xp || 0,
    createdAt: row.created_at,
  };
}

function normalizeAge(age: ProfileInput["age"]) {
  if (age === null || age === undefined || age === "") return null;
  const parsed = Number(age);
  return Number.isFinite(parsed) ? parsed : null;
}

function profilePayload(userId: string, input: ProfileInput) {
  const username = input.username.trim();
  const gender = input.gender || "other";
  const character = input.character || (gender === "female" ? "stella" : "heroA");

  return {
    id: userId,
    username,
    display_name: input.displayName?.trim() || username,
    age: normalizeAge(input.age),
    gender,
    bio: input.bio || "",
    profile_picture: input.profilePicture || "",
    character,
    avatar: input.avatar || "1",
    level: 1,
    xp: 0,
  };
}

export function clerkUserToProfileInput(user: User): ProfileInput {
  const username = user.username || user.emailAddresses[0]?.emailAddress?.split("@")[0] || `user_${user.id.slice(-6)}`;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return {
    username,
    displayName: fullName || username,
    character: "heroA",
    avatar: "1",
  };
}

export async function getUserProfile(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle<UserRow>();

  if (error) {
    throw new Error(`Could not load profile: ${error.message}`);
  }

  return data ? normalizeUser(data) : null;
}

export async function upsertUserProfile(userId: string, input: ProfileInput) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .upsert(profilePayload(userId, input), { onConflict: "id" })
    .select("*")
    .single<UserRow>();

  if (error) {
    throw new Error(`Could not save profile: ${error.message}`);
  }

  return normalizeUser(data);
}

export async function getOrCreateUserProfile(userId: string, input: ProfileInput) {
  const existing = await getUserProfile(userId);
  return existing || upsertUserProfile(userId, input);
}

export async function listFriends(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("friends")
    .select("user_id, friend_id")
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq("status", "ACCEPTED");

  if (error) {
    throw new Error(`Could not load friends: ${error.message}`);
  }

  const friendIds = (data || []).map((row) => (row.user_id === userId ? row.friend_id : row.user_id));
  if (friendIds.length === 0) return [] satisfies FriendProfile[];

  const { data: friendRows, error: usersError } = await supabase.from("users").select("*").in("id", friendIds);

  if (usersError) {
    throw new Error(`Could not load friend profiles: ${usersError.message}`);
  }

  return (friendRows || []).map((row) => normalizeUser(row as UserRow)) satisfies FriendProfile[];
}

export async function addAcceptedFriend(userId: string, targetUsername: string) {
  const supabase = createSupabaseAdminClient();
  const cleanUsername = targetUsername.trim();

  if (!cleanUsername) return;

  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle<{ id: string }>();

  if (targetError) {
    throw new Error(`Could not find friend: ${targetError.message}`);
  }

  if (!target || target.id === userId) return;

  const [firstId, secondId] = [userId, target.id].sort();
  const { error } = await supabase.from("friends").upsert(
    {
      user_id: firstId,
      friend_id: secondId,
      status: "ACCEPTED",
    },
    { onConflict: "user_id,friend_id" },
  );

  if (error) {
    throw new Error(`Could not add friend: ${error.message}`);
  }
}
