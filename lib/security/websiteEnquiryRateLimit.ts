
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000;
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000;

// Check whether a visitor can submit another enquiry.
export async function checkWebsiteEnquiryRateLimit(
  visitorIp: string
): Promise<boolean> {
  const secret = process.env.RATE_LIMIT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "RATE_LIMIT_SECRET must contain at least 32 characters."
    );
  }

  // Hash the visitor identifier rather than storing the raw IP.
  const identifier = createHmac("sha256", secret)
    .update(visitorIp)
    .digest("hex");

  const cutoff = new Date(Date.now() - WINDOW_MS);

  return prisma.$transaction(
    async (tx) => {
      const attempts = await tx.websiteEnquiryRateLimit.count({
        where: {
          identifier,
          createdAt: {
            gte: cutoff,
          },
        },
      });

      // Block visitors who have reached the hourly limit.
      if (attempts >= MAX_ATTEMPTS) {
        return false;
      }

      // Record the permitted attempt.
      await tx.websiteEnquiryRateLimit.create({
        data: {
          identifier,
        },
      });

      return true;
    },
    {
      maxWait: 5000,
      timeout: 10000,
    }
  );
}

// Delete rate-limit records older than 24 hours.
export async function cleanupWebsiteEnquiryRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - CLEANUP_AGE_MS);

  const result = await prisma.websiteEnquiryRateLimit.deleteMany({
    where: {
      createdAt: {
        lt: cutoff,
      },
    },
  });

  return result.count;
}
