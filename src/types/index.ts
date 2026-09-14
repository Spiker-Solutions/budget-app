import type {
  User,
  Budget,
  Envelope,
  Expense,
  Refund,
  Payee,
  BudgetUser,
  EnvelopeUser,
  Goal,
  GoalCharge,
  GoalType,
  RemainderWizardState,
  Role,
  PeriodType,
  RecurrenceType,
} from "@prisma/client";

export type {
  User,
  Budget,
  Envelope,
  Expense,
  Refund,
  Payee,
  BudgetUser,
  EnvelopeUser,
  Goal,
  GoalCharge,
  RemainderWizardState,
};
export { Role, PeriodType, RecurrenceType, GoalType };

export type BudgetWithRelations = Budget & {
  members: (BudgetUser & { user: Pick<User, "id" | "name" | "email" | "image"> })[];
  envelopes: Envelope[];
  payees: Payee[];
  _count?: {
    envelopes: number;
    members: number;
  };
};

export type EnvelopeWithRelations = Envelope & {
  budget: Budget;
  members: (EnvelopeUser & { user: Pick<User, "id" | "name" | "email" | "image"> })[];
  expenses: Expense[];
  _count?: {
    expenses: number;
  };
};

export type RefundWithRelations = Refund & {
  createdBy: Pick<User, "id" | "name" | "email" | "image">;
};

export type GoalWithRelations = Goal & {
  budget: Budget;
  expenses: ExpenseWithRelations[];
  charges: (GoalCharge & {
    createdBy: Pick<User, "id" | "name" | "email" | "image">;
  })[];
};

export type ExpenseWithRelations = Expense & {
  payee: Payee;
  envelope: Envelope;
  goal?: Goal | null;
  createdBy: Pick<User, "id" | "name" | "email" | "image">;
  refunds: RefundWithRelations[];
};

export interface CreateBudgetInput {
  name: string;
  amount: number;
  description?: string;
  currency?: string;
  periodType: PeriodType;
  periodDay?: number;
  customDays?: number;
  startDate?: Date;
  carryOverRemainder?: boolean;
}

export interface UpdateBudgetInput {
  name?: string;
  amount?: number;
  description?: string;
  currency?: string;
  periodType?: PeriodType;
  periodDay?: number;
  customDays?: number;
  startDate?: Date;
  carryOverRemainder?: boolean;
}

export interface CreateEnvelopeInput {
  name: string;
  icon?: string | null;
  color?: string | null;
  allocation: number;
  allocationType?: "AMOUNT" | "PERCENTAGE";
  description?: string;
  budgetId: string;
  carryOverRemainder?: boolean | null;
}

export interface UpdateEnvelopeInput {
  name?: string;
  icon?: string | null;
  color?: string | null;
  allocation?: number;
  allocationType?: "AMOUNT" | "PERCENTAGE";
  description?: string;
  carryOverRemainder?: boolean | null;
}

export interface CreateGoalInput {
  name: string;
  type: GoalType;
  description?: string;
  icon?: string | null;
  color?: string | null;
  startingAmount: number;
  targetAmount: number;
  budgetId: string;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  icon?: string | null;
  color?: string | null;
  startingAmount?: number;
  targetAmount?: number;
}

export interface CreateGoalChargeInput {
  amount: number;
  date?: Date;
  description?: string;
}

export interface CreateExpenseInput {
  amount: number;
  payee: string;
  description?: string;
  location?: string;
  date?: Date;
  envelopeId: string;
  budgetId: string;
  goalId?: string | null;
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
  recurrenceEndDate?: Date | null;
}

export interface UpdateExpenseInput {
  amount?: number;
  payee?: string;
  description?: string;
  location?: string;
  date?: Date;
  envelopeId?: string;
  budgetId?: string;
  goalId?: string | null;
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
  recurrenceEndDate?: Date | null;
}

/** A refund's date is always inherited from its expense, so it is never sent by the client. */
export interface CreateRefundInput {
  amount: number;
  description?: string;
}

export interface UpdateRefundInput {
  amount?: number;
  description?: string;
}

export interface CreatePayeeInput {
  name: string;
  budgetId: string;
}

export interface InviteMemberInput {
  email: string;
  role: Role;
}
