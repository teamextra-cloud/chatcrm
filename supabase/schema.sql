-- ChatCRM Supabase Schema
-- Run this in Supabase SQL Editor to create tables and indexes

-- Message type enum (Postgres uses text; we enforce in app)
-- message_type: text, image, video, file

-- Customers: one per platform user (LINE or Facebook)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_id)
);

-- Messages: all conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,  -- 'customer' | 'agent'
  message_type TEXT NOT NULL, -- 'text' | 'image' | 'video' | 'file'
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_platform_id ON customers(platform_id);
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_message_at ON customers(last_message_at DESC NULLS LAST);

-- Optional: RLS policies (disable if using service role only)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
