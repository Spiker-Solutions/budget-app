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

const expenseSchemaBase = z.object({
  amount: z.number().positive("Amount must be positive"),
  payee: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  date: z.string().or(z.date()).optional(),
  envelopeId: z.string().min(1, "Envelope is required"),
  budgetId: z.string().min(1, "Budget is required"),
  goalId: z.string().min(1).optional().nullable(),
  recurrence: z
    .enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"])
    .default("NONE"),
  recurrenceEndDate: z.string().or(z.date()).nullable().optional(),
});

function validateRecurrenceEndDate(
  data: {
    recurrence?: string;
    recurrenceEndDate?: string | Date | null;
    date?: string | Date;
  },
  ctx: z.RefinementCtx
) {
  if (data.recurrence === "NONE" || !data.recurrence) return;
  if (!data.recurrenceEndDate || !data.date) return;

  const end = new Date(data.recurrenceEndDate);
  const start = new Date(data.date);
  if (end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after the first occurrence date",
      path: ["recurrenceEndDate"],
    });
  }
}

function validateExpensePayee(
  data: { payee?: string; goalId?: string | null },
  ctx: z.RefinementCtx
) {
  if (data.goalId) return;
  if (!data.payee || data.payee.trim().length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payee is required",
      path: ["payee"],
    });
  }
}

export const createExpenseSchema = expenseSchemaBase
  .superRefine(validateRecurrenceEndDate)
  .superRefine(validateExpensePayee);

export const updateExpenseSchema = expenseSchemaBase
  .partial()
  .omit({ budgetId: true })
  .superRefine(validateRecurrenceEndDate)
  .superRefine(validateExpensePayee);

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

export const goalTypeSchema = z.enum(["SAVE", "DEBT"]);

const goalSchemaBase = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: goalTypeSchema,
  description: z.string().max(500).optional(),
  icon: z.enum(ENVELOPE_ICON_NAMES as [string, ...string[]]).nullable().optional(),
  color: z.enum([...ENVELOPE_COLORS]).nullable().optional(),
  startingAmount: z.number().min(0, "Starting amount cannot be negative"),
  targetAmount: z.number().min(0, "Target cannot be negative"),
  budgetId: z.string().min(1, "Budget ID is required"),
});

function validateGoalTargets(
  data: { type: "SAVE" | "DEBT"; startingAmount: number; targetAmount: number },
  ctx: z.RefinementCtx
) {
  if (data.type === "SAVE" && data.targetAmount <= data.startingAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Save target must be greater than starting saved amount",
      path: ["targetAmount"],
    });
  }
  if (data.type === "DEBT" && data.targetAmount > data.startingAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Payoff target cannot exceed starting balance owed",
      path: ["targetAmount"],
    });
  }
}

export const createGoalSchema = goalSchemaBase.superRefine(validateGoalTargets);

export const updateGoalSchema = goalSchemaBase.partial().omit({ budgetId: true, type: true });

export const createGoalChargeSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().or(z.date()).optional(),
  description: z.string().max(500).optional(),
});

export const remainderWizardDismissSchema = z.object({
  budgetId: z.string().min(1),
  periodStart: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()),
});

export const remainderWizardSubmitSchema = z.object({
  budgetId: z.string().min(1),
  periodStart: z.string().or(z.date()),
  periodEnd: z.string().or(z.date()),
  allocations: z.array(
    z.object({
      envelopeId: z.string().min(1),
      goalId: z.string().min(1).optional(),
      amount: z.number().min(0),
      keepInEnvelope: z.boolean(),
    })
  ),
});
