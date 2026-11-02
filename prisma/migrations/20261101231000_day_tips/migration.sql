-- Stage 2: tips entered per day (cash / e-transfer).
CREATE TABLE IF NOT EXISTS "DayTips" (
    "date" TEXT NOT NULL,
    "cashTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etransferTips" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayTips_pkey" PRIMARY KEY ("date")
);

-- Keep Supabase's public REST API locked out of this table (no policies = no access).
ALTER TABLE "DayTips" ENABLE ROW LEVEL SECURITY;
