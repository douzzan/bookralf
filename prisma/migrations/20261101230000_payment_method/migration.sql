-- Stage 1: how a completed booking was paid ("cash" | "etransfer").
-- IF NOT EXISTS because the column was already added to the live database by hand.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
