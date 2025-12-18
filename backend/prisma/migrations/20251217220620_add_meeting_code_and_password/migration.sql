-- Delete existing demo meetings since they don't have meetingCode
DELETE FROM "Meeting";

-- Drop existing foreign key constraint to modify hostId
ALTER TABLE "Meeting" DROP CONSTRAINT IF EXISTS "Meeting_hostId_fkey";

-- Add new columns
ALTER TABLE "Meeting" ADD COLUMN "meetingCode" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "password" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make hostId nullable
ALTER TABLE "Meeting" ALTER COLUMN "hostId" DROP NOT NULL;

-- Add unique constraint on meetingCode
CREATE UNIQUE INDEX "Meeting_meetingCode_key" ON "Meeting"("meetingCode");

-- Recreate foreign key (with ON DELETE SET NULL since hostId is now nullable)
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

