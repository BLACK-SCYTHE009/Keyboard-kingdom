-- Supabase Database Schema for Keyboard Kingdom
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    age INTEGER,
    gender TEXT DEFAULT 'other',
    bio TEXT DEFAULT '',
    profile_picture TEXT DEFAULT '',
    character TEXT DEFAULT 'heroA',
    avatar TEXT DEFAULT '1',
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create index on character for filtering
CREATE INDEX IF NOT EXISTS idx_users_character ON users(character);

-- Create index on level for leaderboards
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level DESC);

-- Create index on xp for leaderboards
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);

-- Game sessions table (optional for tracking game history)
CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    xp_gained INTEGER NOT NULL,
    monsters_defeated INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for game sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);

-- Create index on created_at for game sessions
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- Friend connections
CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACCEPTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT friends_not_self CHECK (user_id <> friend_id),
    CONSTRAINT friends_unique_pair UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- Direct messages, reserved for the friends screen
CREATE TABLE IF NOT EXISTS direct_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_id ON direct_messages(receiver_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data"
    ON users FOR SELECT
    USING (auth.uid()::text = id);

-- Allow users to insert their own data (during signup)
CREATE POLICY "Users can insert own data"
    ON users FOR INSERT
    WITH CHECK (auth.uid()::text = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
    ON users FOR UPDATE
    USING (auth.uid()::text = id);

-- Allow service role to read all data (for server operations)
CREATE POLICY "Service role can read all users"
    ON users FOR SELECT
    USING (auth.role() = 'service_role');

-- Allow service role to update all data (for server operations)
CREATE POLICY "Service role can update all users"
    ON users FOR UPDATE
    USING (auth.role() = 'service_role');

-- Enable RLS for game_sessions
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own game sessions
CREATE POLICY "Users can view own game sessions"
    ON game_sessions FOR SELECT
    USING (auth.uid()::text = user_id);

-- Allow users to insert their own game sessions
CREATE POLICY "Users can insert own game sessions"
    ON game_sessions FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- Allow service role to read all game sessions
CREATE POLICY "Service role can read all game sessions"
    ON game_sessions FOR SELECT
    USING (auth.role() = 'service_role');

-- Allow service role to insert game sessions
CREATE POLICY "Service role can insert game sessions"
    ON game_sessions FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Enable RLS for friends and messages
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friends"
    ON friends FOR SELECT
    USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

CREATE POLICY "Users can add own friends"
    ON friends FOR INSERT
    WITH CHECK (auth.uid()::text = user_id OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage friends"
    ON friends FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view own messages"
    ON direct_messages FOR SELECT
    USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Service role can manage messages"
    ON direct_messages FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
