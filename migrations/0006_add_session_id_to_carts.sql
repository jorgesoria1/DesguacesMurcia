
-- Add sessionId column to carts table for guest cart support
ALTER TABLE "carts" ADD COLUMN "session_id" text;

-- Make userId nullable for guest carts
ALTER TABLE "carts" ALTER COLUMN "user_id" DROP NOT NULL;

-- Add index for session_id lookups
CREATE INDEX idx_carts_session_id ON "carts" ("session_id");
