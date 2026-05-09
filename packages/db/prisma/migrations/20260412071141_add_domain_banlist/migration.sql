-- CreateTable
CREATE TABLE "domain_banlist" (
    "id" SERIAL NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(25),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "domain_banlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_banlist_domain_key" ON "domain_banlist"("domain");
