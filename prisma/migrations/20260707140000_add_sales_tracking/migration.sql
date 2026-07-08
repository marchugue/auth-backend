-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cogs_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "productItem" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "uom" TEXT NOT NULL,
    "cost" DECIMAL(12,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_cogs_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_revenue_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "productId" TEXT NOT NULL,
    "revenueAmount" DECIMAL(12,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_revenue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilities" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "utilityName" TEXT NOT NULL,
    "monthlyCost" DECIMAL(12,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_businessId_idx" ON "products"("businessId");

-- CreateIndex
CREATE INDEX "products_businessId_deletedAt_idx" ON "products"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "daily_cogs_entries_businessId_entryDate_idx" ON "daily_cogs_entries"("businessId", "entryDate");

-- CreateIndex
CREATE INDEX "daily_cogs_entries_businessId_deletedAt_idx" ON "daily_cogs_entries"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "daily_revenue_entries_businessId_entryDate_idx" ON "daily_revenue_entries"("businessId", "entryDate");

-- CreateIndex
CREATE INDEX "daily_revenue_entries_productId_idx" ON "daily_revenue_entries"("productId");

-- CreateIndex
CREATE INDEX "daily_revenue_entries_businessId_deletedAt_idx" ON "daily_revenue_entries"("businessId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "utilities_businessId_utilityName_month_year_key" ON "utilities"("businessId", "utilityName", "month", "year");

-- CreateIndex
CREATE INDEX "utilities_businessId_year_month_idx" ON "utilities"("businessId", "year", "month");

-- CreateIndex
CREATE INDEX "utilities_businessId_deletedAt_idx" ON "utilities"("businessId", "deletedAt");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_cogs_entries" ADD CONSTRAINT "daily_cogs_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_revenue_entries" ADD CONSTRAINT "daily_revenue_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_revenue_entries" ADD CONSTRAINT "daily_revenue_entries_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilities" ADD CONSTRAINT "utilities_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
