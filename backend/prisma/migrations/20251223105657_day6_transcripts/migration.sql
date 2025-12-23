/*
  Warnings:

  - You are about to drop the column `content` on the `Transcript` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Transcript` table. All the data in the column will be lost.
  - Made the column `meetingCode` on table `Meeting` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `rawText` to the `Transcript` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "meetingCode" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transcript" DROP COLUMN "content",
DROP COLUMN "summary",
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "rawText" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'whisper';
