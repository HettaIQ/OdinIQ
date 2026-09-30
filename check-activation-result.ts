import { prisma } from "./lib/prisma";

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "admin@odiniq-test.invalid",
    },
    include: {
      memberships: {
        include: {
          company: true,
          role: true,
        },
      },
      activationTokens: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    throw new Error("Test Administrator not found.");
  }

  console.log("");
  console.log("ACTIVATION RESULT");
  console.log("=================");
  console.log("User:", user.email);
  console.log("Password set:", Boolean(user.passwordHash));
  console.log("Platform role:", user.platformRole);

  console.log("");
  console.log("COMPANY ACCESS");
  console.log("==============");

  for (const membership of user.memberships) {
    console.log(
      `${membership.company.name} | ${membership.role?.name} | Active: ${membership.active}`
    );
  }

  console.log("");
  console.log("ACTIVATION TOKENS");
  console.log("=================");

  for (const token of user.activationTokens) {
    console.log(
      `ID ${token.id} | Used: ${Boolean(token.usedAt)} | Expires: ${token.expiresAt.toISOString()}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
