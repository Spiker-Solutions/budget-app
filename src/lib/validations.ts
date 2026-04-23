import { z } from "zod";

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
  periodType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  periodDay: z.number().min(0).max(31).optional(),
  customDays: z.number().min(1).max(365).optional(),
  startDate: z.string().or(z.date()).optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export const createEnvelopeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  allocation: z.number().min(0, "Allocation cannot be negative"),
  description: z.string().max(500).optional(),
  budgetId: z.string().min(1, "Budget ID is required"),
});

export const updateEnvelopeSchema = createEnvelopeSchema.partial().omit({ budgetId: true });

export const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  payee: z.string().min(1, "Payee is required"),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  date: z.string().or(z.date()).optional(),
  envelopeId: z.string().min(1, "Envelope is required"),
  budgetId: z.string().min(1, "Budget is required"),
  isRecurring: z.boolean().default(false),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]).default("NONE"),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const createPayeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  budgetId: z.string().min(1, "Budget ID is required"),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "USER"]),
});
