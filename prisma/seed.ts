import { PrismaClient, RecurrenceType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PREFIX = "[Demo] ";
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "test@test.com";

function normalizePayeeName(name: string): string {
  return name.trim().toLowerCase();
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  return date;
}

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function upsertDemoUser(
  email: string,
  name: string,
  password = "password123"
) {
  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, password: hashedPassword },
  });
}

async function clearExistingDemoData(userId: string) {
  const demoBudgets = await prisma.budget.findMany({
    where: {
      name: { startsWith: DEMO_PREFIX },
      members: { some: { userId } },
    },
    select: { id: true, name: true },
  });

  if (demoBudgets.length === 0) {
    return;
  }

  for (const budget of demoBudgets) {
    await prisma.budget.delete({ where: { id: budget.id } });
    console.log(`  Removed existing demo budget: ${budget.name}`);
  }
}

async function main() {
  const forceReseed = process.env.FORCE_SEED === "1";

  console.log(`Seeding mock data for ${SEED_USER_EMAIL}...`);

  const primaryUser = await prisma.user.findUnique({
    where: { email: SEED_USER_EMAIL },
  });

  if (!primaryUser) {
    throw new Error(
      `User "${SEED_USER_EMAIL}" not found. Register or log in first, then run: npm run db:seed`
    );
  }

  const existingDemo = await prisma.budget.findFirst({
    where: {
      name: { startsWith: DEMO_PREFIX },
      members: { some: { userId: primaryUser.id } },
    },
  });

  if (existingDemo && !forceReseed) {
    console.log(
      "Demo data already exists. Set FORCE_SEED=1 to replace it, e.g.: FORCE_SEED=1 npm run db:seed"
    );
    return;
  }

  if (existingDemo && forceReseed) {
    console.log("Removing previous demo data...");
    await clearExistingDemoData(primaryUser.id);
  }

  const partnerUser = await upsertDemoUser(
    "partner@test.com",
    "Alex Partner"
  );
  const roommateUser = await upsertDemoUser(
    "roommate@test.com",
    "Sam Roommate"
  );

  console.log("Creating household budget...");
  const householdBudget = await prisma.budget.create({
    data: {
      name: `${DEMO_PREFIX}Household Budget`,
      amount: 5500,
      description: "Monthly household spending — groceries, bills, and day-to-day expenses.",
      currency: "USD",
      periodType: "MONTHLY",
      periodDay: 1,
      startDate: monthsAgo(4),
      carryOverRemainder: true,
      members: {
        create: [
          { userId: primaryUser.id, role: "OWNER" },
          { userId: partnerUser.id, role: "ADMIN" },
          { userId: roommateUser.id, role: "USER" },
        ],
      },
    },
  });

  const householdEnvelopes = [
    { name: "Groceries", allocation: 850, description: "Supermarket and bulk shopping" },
    { name: "Dining Out", allocation: 350, description: "Restaurants, coffee, takeout" },
    { name: "Utilities", allocation: 450, description: "Electric, gas, water, internet" },
    { name: "Transportation", allocation: 400, description: "Gas, transit, rideshare" },
    { name: "Entertainment", allocation: 250, description: "Streaming, movies, hobbies" },
    { name: "Health & Wellness", allocation: 200, description: "Pharmacy, gym, copays" },
    { name: "Home & Maintenance", allocation: 300, description: "Repairs, supplies, decor" },
    { name: "Miscellaneous", allocation: 200, description: "Everything else" },
  ];

  const envelopeRecords: Array<{ id: string; name: string }> = [];

  for (const envelope of householdEnvelopes) {
    const created = await prisma.envelope.create({
      data: {
        ...envelope,
        budgetId: householdBudget.id,
        members: {
          create: [
            { userId: primaryUser.id, role: "OWNER" },
            { userId: partnerUser.id, role: "ADMIN" },
          ],
        },
      },
    });
    envelopeRecords.push({ id: created.id, name: created.name });
  }

  console.log("Creating vacation savings budget...");
  const vacationBudget = await prisma.budget.create({
    data: {
      name: `${DEMO_PREFIX}Vacation Fund`,
      amount: 600,
      description: "Saving for summer trip — biweekly contributions.",
      currency: "USD",
      periodType: "BIWEEKLY",
      periodDay: 5,
      startDate: monthsAgo(3),
      carryOverRemainder: true,
      members: {
        create: [{ userId: primaryUser.id, role: "OWNER" }],
      },
    },
  });

  const vacationEnvelope = await prisma.envelope.create({
    data: {
      name: "Trip Savings",
      allocation: 600,
      description: "Flights, hotels, activities",
      budgetId: vacationBudget.id,
      carryOverRemainder: true,
      members: {
        create: [{ userId: primaryUser.id, role: "OWNER" }],
      },
    },
  });

  const payeeDefinitions: Array<{
    name: string;
    envelopeName: string;
    amountRange: [number, number];
    descriptions: string[];
    locations?: string[];
    recurring?: RecurrenceType;
  }> = [
    {
      name: "Whole Foods",
      envelopeName: "Groceries",
      amountRange: [35, 145],
      descriptions: ["Weekly groceries", "Organic produce run", "Bulk pantry items"],
      locations: ["Downtown", "Westside"],
    },
    {
      name: "Target",
      envelopeName: "Groceries",
      amountRange: [18, 95],
      descriptions: ["Household essentials", "Snacks and drinks"],
      locations: ["Target #1842"],
    },
    {
      name: "Costco",
      envelopeName: "Groceries",
      amountRange: [80, 220],
      descriptions: ["Monthly stock-up", "Bulk groceries"],
      locations: ["Costco Wholesale"],
    },
    {
      name: "Chipotle",
      envelopeName: "Dining Out",
      amountRange: [12, 28],
      descriptions: ["Lunch bowl", "Burrito dinner"],
      locations: ["Main St", "Food court"],
    },
    {
      name: "Starbucks",
      envelopeName: "Dining Out",
      amountRange: [5, 14],
      descriptions: ["Morning coffee", "Afternoon latte"],
    },
    {
      name: "Local Pizza Co",
      envelopeName: "Dining Out",
      amountRange: [22, 48],
      descriptions: ["Friday night pizza", "Game night order"],
    },
    {
      name: "Pacific Gas & Electric",
      envelopeName: "Utilities",
      amountRange: [85, 165],
      descriptions: ["Electric bill", "Monthly utility payment"],
      recurring: "MONTHLY",
    },
    {
      name: "Comcast",
      envelopeName: "Utilities",
      amountRange: [79, 89],
      descriptions: ["Internet service", "Cable & internet bundle"],
      recurring: "MONTHLY",
    },
    {
      name: "City Water Dept",
      envelopeName: "Utilities",
      amountRange: [42, 68],
      descriptions: ["Water & sewer bill"],
      recurring: "MONTHLY",
    },
    {
      name: "Shell",
      envelopeName: "Transportation",
      amountRange: [35, 72],
      descriptions: ["Gas fill-up", "Fuel"],
      locations: ["Highway 101", "Oak Ave"],
    },
    {
      name: "Uber",
      envelopeName: "Transportation",
      amountRange: [11, 38],
      descriptions: ["Airport ride", "Downtown trip", "Late night ride home"],
    },
    {
      name: "Netflix",
      envelopeName: "Entertainment",
      amountRange: [15.49, 15.49],
      descriptions: ["Streaming subscription"],
      recurring: "MONTHLY",
    },
    {
      name: "Spotify",
      envelopeName: "Entertainment",
      amountRange: [10.99, 10.99],
      descriptions: ["Premium subscription"],
      recurring: "MONTHLY",
    },
    {
      name: "AMC Theaters",
      envelopeName: "Entertainment",
      amountRange: [28, 55],
      descriptions: ["Movie tickets", "Date night at the movies"],
    },
    {
      name: "CVS Pharmacy",
      envelopeName: "Health & Wellness",
      amountRange: [8, 45],
      descriptions: ["Prescription copay", "Vitamins and toiletries"],
    },
    {
      name: "Planet Fitness",
      envelopeName: "Health & Wellness",
      amountRange: [24.99, 24.99],
      descriptions: ["Gym membership"],
      recurring: "MONTHLY",
    },
    {
      name: "Home Depot",
      envelopeName: "Home & Maintenance",
      amountRange: [25, 180],
      descriptions: ["Paint supplies", "Light fixtures", "Garden tools"],
    },
    {
      name: "Amazon",
      envelopeName: "Miscellaneous",
      amountRange: [12, 89],
      descriptions: ["Online order", "Household item", "Book purchase"],
    },
    {
      name: "Dry Cleaner",
      envelopeName: "Miscellaneous",
      amountRange: [18, 42],
      descriptions: ["Suit cleaning", "Winter coat cleaning"],
    },
  ];

  const envelopeByName = new Map(envelopeRecords.map((e) => [e.name, e.id]));
  const payeeByName = new Map<string, string>();

  console.log("Creating payees and expenses...");
  let expenseCount = 0;

  for (const payeeDef of payeeDefinitions) {
    const normalizedName = normalizePayeeName(payeeDef.name);
    const payee = await prisma.payee.create({
      data: {
        name: payeeDef.name,
        normalizedName,
        budgetId: householdBudget.id,
      },
    });
    payeeByName.set(payeeDef.name, payee.id);

    const envelopeId = envelopeByName.get(payeeDef.envelopeName);
    if (!envelopeId) continue;

    if (payeeDef.recurring) {
      for (let month = 0; month < 4; month++) {
        const date = monthsAgo(month);
        date.setDate(15);
        await prisma.expense.create({
          data: {
            amount: payeeDef.amountRange[0],
            description: payeeDef.descriptions[0],
            date,
            isRecurring: true,
            recurrence: payeeDef.recurring,
            payeeId: payee.id,
            envelopeId,
            createdById: primaryUser.id,
          },
        });
        expenseCount++;
      }
      continue;
    }

    const transactionCount = randomBetween(3, 8);
    for (let i = 0; i < transactionCount; i++) {
      const daysBack = Math.floor(Math.random() * 120);
      await prisma.expense.create({
        data: {
          amount: randomBetween(payeeDef.amountRange[0], payeeDef.amountRange[1]),
          description: pickRandom(payeeDef.descriptions),
          location: payeeDef.locations ? pickRandom(payeeDef.locations) : undefined,
          date: daysAgo(daysBack),
          isRecurring: false,
          payeeId: payee.id,
          envelopeId,
          createdById: pickRandom([primaryUser.id, partnerUser.id]),
        },
      });
      expenseCount++;
    }
  }

  const vacationDeposits = [
    { days: 75, amount: 150, description: "Biweekly savings transfer" },
    { days: 61, amount: 150, description: "Biweekly savings transfer" },
    { days: 47, amount: 175, description: "Extra contribution" },
    { days: 33, amount: 150, description: "Biweekly savings transfer" },
    { days: 19, amount: 150, description: "Biweekly savings transfer" },
    { days: 5, amount: 125, description: "Biweekly savings transfer" },
  ];

  let vacationPayee = await prisma.payee.findUnique({
    where: {
      budgetId_normalizedName: {
        budgetId: vacationBudget.id,
        normalizedName: normalizePayeeName("Savings Transfer"),
      },
    },
  });

  if (!vacationPayee) {
    vacationPayee = await prisma.payee.create({
      data: {
        name: "Savings Transfer",
        normalizedName: normalizePayeeName("Savings Transfer"),
        budgetId: vacationBudget.id,
      },
    });
  }

  for (const deposit of vacationDeposits) {
    await prisma.expense.create({
      data: {
        amount: deposit.amount,
        description: deposit.description,
        date: daysAgo(deposit.days),
        payeeId: vacationPayee.id,
        envelopeId: vacationEnvelope.id,
        createdById: primaryUser.id,
      },
    });
    expenseCount++;
  }

  console.log("");
  console.log("Mock data created successfully!");
  console.log("");
  console.log("  Budgets:");
  console.log(`    • ${householdBudget.name} ($5,500/mo, 8 envelopes)`);
  console.log(`    • ${vacationBudget.name} ($600/biweekly, 1 envelope)`);
  console.log("");
  console.log(`  Expenses: ${expenseCount} transactions over the last ~4 months`);
  console.log("");
  console.log("  Extra test accounts (password: password123):");
  console.log("    • partner@test.com  — ADMIN on household budget");
  console.log("    • roommate@test.com — USER on household budget");
  console.log("");
  console.log("  Log in as test@test.com and refresh the dashboard to explore.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
