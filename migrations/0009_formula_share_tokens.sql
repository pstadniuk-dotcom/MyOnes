ALTER TABLE "formulas"
ADD COLUMN IF NOT EXISTS "is_shared_publicly" boolean DEFAULT false NOT NULL;

ALTER TABLE "formulas"
ADD COLUMN IF NOT EXISTS "share_token" varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS "formulas_share_token_idx"
ON "formulas" ("share_token");
