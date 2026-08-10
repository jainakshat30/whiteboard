-- CreateEnum
CREATE TYPE "BoardRole" AS ENUM ('HOST', 'EDITOR', 'AUDIENCE');

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "subject" TEXT;

-- CreateTable
CREATE TABLE "board_participants" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "BoardRole" NOT NULL DEFAULT 'AUDIENCE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "board_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_participants_boardId_userId_key" ON "board_participants"("boardId", "userId");

-- AddForeignKey
ALTER TABLE "board_participants" ADD CONSTRAINT "board_participants_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_participants" ADD CONSTRAINT "board_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
