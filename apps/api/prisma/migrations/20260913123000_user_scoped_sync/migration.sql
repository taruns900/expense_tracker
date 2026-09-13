-- Unscoped rows cannot be attributed to an account.
DELETE FROM "ChangeLog";
DELETE FROM "Expense";
DELETE FROM "SubCategory";
DELETE FROM "Category";

-- Category: composite primary key (userId, id)
ALTER TABLE "Category" DROP CONSTRAINT "Category_pkey";
ALTER TABLE "Category" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "Category" ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("userId", "id");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SubCategory: composite primary key (userId, id)
ALTER TABLE "SubCategory" DROP CONSTRAINT "SubCategory_pkey";
ALTER TABLE "SubCategory" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("userId", "id");
CREATE INDEX "SubCategory_userId_idx" ON "SubCategory"("userId");
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Expense: owner + unique display id per user
ALTER TABLE "Expense" ADD COLUMN "userId" TEXT NOT NULL;
DROP INDEX IF EXISTS "Expense_expenseId_key";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_expenseId_key";
CREATE UNIQUE INDEX "Expense_userId_expenseId_key" ON "Expense"("userId", "expenseId");
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Change log scoped to the same account
ALTER TABLE "ChangeLog" ADD COLUMN "userId" TEXT NOT NULL;
CREATE INDEX "ChangeLog_userId_createdAt_idx" ON "ChangeLog"("userId", "createdAt");
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
