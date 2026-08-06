import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";

async function main() {
  const password = "LisaKieraPaige759699!76Jamie";

  const passwordHash = hashPassword(password);

  await prisma.user.update({
    where: {
      email: "jamie@odiniq.co.uk",
    },
    data: {
      passwordHash,
    },
  });

  console.log("Password successfully set.");
}

main()
  .catch((error) => {
    console.error("Password setup failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });