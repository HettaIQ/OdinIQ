import { prisma } from "./lib/prisma";
import { createAccountActivationToken } from "./lib/auth/accountActivation";

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "admin@odiniq-test.invalid",
    },
  });

  if (!user) {
    throw new Error("Test Administrator not found.");
  }

  const activation =
    await createAccountActivationToken(user.id);

  const storedToken =
    await prisma.accountActivationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!storedToken) {
    throw new Error(
      "Activation token was not stored."
    );
  }

  console.log("");
  console.log("ACCOUNT ACTIVATION TEST");
  console.log("=======================");
  console.log("User:", user.email);
  console.log(
    "Raw token length:",
    activation.token.length
  );
  console.log(
    "Stored hash length:",
    storedToken.tokenHash.length
  );
  console.log(
    "Raw token stored directly:",
    storedToken.tokenHash ===
      activation.token
  );
  console.log(
    "Used:",
    storedToken.usedAt !== null
  );
  console.log(
    "Expires:",
    storedToken.expiresAt
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
