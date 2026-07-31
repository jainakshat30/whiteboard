-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
