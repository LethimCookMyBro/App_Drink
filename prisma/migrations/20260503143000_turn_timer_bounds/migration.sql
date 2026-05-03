ALTER TABLE "GameSession"
ADD COLUMN "currentTurnStartedAt" TIMESTAMP(3),
ADD COLUMN "currentTurnExpiresAt" TIMESTAMP(3);
