-- Login identity is phone. Recovery email is not used to sign in.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Owner';
ALTER TABLE "User" RENAME COLUMN "email" TO "recoveryEmail";

UPDATE "User"
SET "phone" = 'pending-' || substr("id", 1, 12)
WHERE "phone" IS NULL;

ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;

DROP INDEX IF EXISTS "User_email_key";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_recoveryEmail_key" ON "User"("recoveryEmail");
