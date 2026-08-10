ALTER TABLE "User"
ADD COLUMN "mainCharacterId" TEXT;

CREATE UNIQUE INDEX "User_mainCharacterId_key"
ON "User"("mainCharacterId");

ALTER TABLE "User"
ADD CONSTRAINT "User_mainCharacterId_fkey"
FOREIGN KEY ("mainCharacterId") REFERENCES "Character"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
