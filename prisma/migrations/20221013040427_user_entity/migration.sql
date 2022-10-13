-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "otp_enabled" BOOLEAN NOT NULL DEFAULT true,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "otp_token" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
