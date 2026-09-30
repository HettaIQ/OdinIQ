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

  console.log("");
  console.log("ACTIVATION LINK");
  console.log("===============");
  console.log(
    `http://localhost:3001/activate?token=${activation.token}`
  );
  console.log("");
  console.log(
    "Expires:",
    activation.expiresAt
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
