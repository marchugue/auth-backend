-- Step 1: Add column as nullable so existing rows don't fail
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Step 2: Backfill existing rows — use the email prefix (before @) as their username
UPDATE "users" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Step 3: Make the column required
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Step 4: Add the unique constraint
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
