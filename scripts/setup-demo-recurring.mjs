import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "fs/promises";

const prisma = new PrismaClient();
const DEMO_ENVELOPE_NAME = "[Demo] Recurring";
const DEMO_PAYEES = ["demo netflix", "demo yearly insurance", "demo daily coffee"];
const ENVELOPE_ID_FILE = "/tmp/demo-recurring-envelope-id.txt";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "test@test.com" } });
  if (!user) throw new Error("test@test.com not found — run npm run db:seed");

  const budget = await prisma.budget.findFirst({
    where: {
      name: { contains: "[Demo] Household" },
      members: { some: { userId: user.id } },
    },
  });
  if (!budget) throw new Error("Demo budget not found");

  const payees = await prisma.payee.findMany({
    where: { normalizedName: { in: DEMO_PAYEES } },
    select: { id: true },
  });
  const payeeIds = payees.map((p) => p.id);
  if (payeeIds.length) {
    await prisma.expense.deleteMany({ where: { payeeId: { in: payeeIds } } });
    await prisma.payee.deleteMany({ where: { id: { in: payeeIds } } });
  }

  const existing = await prisma.envelope.findFirst({
    where: { budgetId: budget.id, name: DEMO_ENVELOPE_NAME },
  });

  const envelope =
    existing ??
    (await prisma.envelope.create({
      data: {
        name: DEMO_ENVELOPE_NAME,
        description: "Isolated envelope for recurring expense demos",
        allocation: 500,
        allocationType: "AMOUNT",
        color: "violet",
        budgetId: budget.id,
      },
    }));

  await writeFile(ENVELOPE_ID_FILE, envelope.id, "utf8");
  console.log(`Demo envelope ready: ${envelope.name} (${envelope.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
