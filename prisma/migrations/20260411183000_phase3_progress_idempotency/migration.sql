ALTER TABLE "GameSession"
ADD COLUMN "currentTurnToken" TEXT;

ALTER TABLE "GameEvent"
ADD COLUMN "turnToken" TEXT,
ADD COLUMN "requestId" TEXT;

CREATE UNIQUE INDEX "GameEvent_sessionId_turnToken_key"
ON "GameEvent"("sessionId", "turnToken");

CREATE UNIQUE INDEX "GameEvent_sessionId_requestId_key"
ON "GameEvent"("sessionId", "requestId");
