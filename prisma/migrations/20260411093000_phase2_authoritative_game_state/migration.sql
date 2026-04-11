-- AlterTable
ALTER TABLE "GameSession"
ADD COLUMN "resumePath" TEXT,
ADD COLUMN "currentPlayerId" TEXT,
ADD COLUMN "currentQuestionId" TEXT,
ADD COLUMN "currentQuestionText" TEXT,
ADD COLUMN "currentQuestionType" "QuestionType",
ADD COLUMN "currentQuestionLevel" INTEGER,
ADD COLUMN "currentQuestionIs18Plus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "currentQuestionIsCustom" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoomQuestion" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionId" TEXT,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'QUESTION',
    "level" INTEGER NOT NULL DEFAULT 2,
    "is18Plus" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomQuestion_roomId_createdAt_idx" ON "RoomQuestion"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "RoomQuestion_sessionId_createdAt_idx" ON "RoomQuestion"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "RoomQuestion"
ADD CONSTRAINT "RoomQuestion_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomQuestion"
ADD CONSTRAINT "RoomQuestion_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
