import { z } from "zod";
import { ENVELOPE_ICON_NAMES } from "@/lib/envelope-icons";
import { ENVELOPE_COLORS } from "@/lib/envelope-colors";

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default("USD"),
  periodType: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  periodDay: z.number().min(0).max(31).optional(),
  customDays: z.number().min(1).max(365).optional(),
  startDate: z.string().or(z.date()).optional(),
  carryOverRemainder: z.boolean().optional().default(false),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export const allocationTypeSchema = z.enum(["AMOUNT", "PERCENTAGE"]);

const envelopeAllocationRefinement = (
  data: { allocation: number; allocationType?: "AMOUNT" | "PERCENTAGE" },
  ctx: z.RefinementCtx
) => {
  if (data.allocationType === "PERCENTAGE") {
    if (data.allocation <= 0 || data.allocation > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage must be between 0 and 100",
        path: ["allocation"],
      });
    }
    return;
  }

  if (data.allocation < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Allocation cannot be negative",
      path: ["allocation"],
    });
  }
};

const envelopeSchemaBase = z.object({
  name: z.string().min(1, "Name is required").max(100),
  icon: z.enum(ENVELOPE_ICON_NAMES as [string, ...string[]]).nullable().optional(),
  color: z.enum([...ENVELOPE_COLORS]).nullable().optional(),
  allocation: z.number(),
  allocationType: allocationTypeSchema.optional().default("AMOUNT"),
  description: z.string().max(500).optional(),
  budgetId: z.string().min(1, "Budget ID is required"),
  carryOverRemainder: z.boolean().nullable().optional(),
});

export const createEnvelopeSchema = envelopeSchemaBase.superRefine(envelopeAllocationRefinement);

export const updateEnvelopeSchema = envelopeSchemaBase
  .partial()
  .omit({ budgetId: true })
  .superRefine((data, ctx) => {
    if (data.allocation === undefined) return;
    envelopeAllocationRefinement(
      { allocation: data.allocation, allocationType: data.allocationType },
      ctx
    );
  });

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

/**
 * A refund has no `date` field: it always inherits the parent expense's date,
 * written server-side on create and re-synced when the expense date changes.
 * The "refunds must not exceed the expense" rule spans sibling rows, so it is
 * enforced transactionally in the API rather than here.
 */
export const createRefundSchema = z.object({
  amount: z.number().positive("Refund amount must be positive"),
  description: z.string().max(500).optional(),
});

export const updateRefundSchema = createRefundSchema.partial();

export const createPayeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  budgetId: z.string().min(1, "Budget ID is required"),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "USER"]),
});
