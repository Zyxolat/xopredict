-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "notifyMatchSettlement" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySecurityAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPromotions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowMatchHistoryView" BOOLEAN NOT NULL DEFAULT true;
