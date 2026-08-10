ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isAdmin" = true
WHERE "id" = 'cmo93jj7u0008f6k46zkk3pmh'
  OR "name" = 'ДикийОпоссум#21251'
  OR EXISTS (
    SELECT 1
    FROM "Account"
    WHERE "Account"."userId" = "User"."id"
      AND "Account"."provider" = 'battlenet'
      AND "Account"."providerAccountId" = '1171677661'
  );
