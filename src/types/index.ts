import type {
  User,
  Budget,
  Envelope,
  Expense,
  Payee,
  BudgetUser,
  EnvelopeUser,
  Role,
  PeriodType,
  RecurrenceType,
} from "@prisma/client";

export type { User, Budget, Envelope, Expense, Payee, BudgetUser, EnvelopeUser };
export { Role, PeriodType, RecurrenceType };

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

export type ExpenseWithRelations = Expense & {
  payee: Payee;
  envelope: Envelope;
  createdBy: Pick<User, "id" | "name" | "email" | "image">;
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
}

export interface CreateEnvelopeInput {
  name: string;
  allocation: number;
  description?: string;
  budgetId: string;
}

export interface UpdateEnvelopeInput {
  name?: string;
  allocation?: number;
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
  isRecurring?: boolean;
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
}

export interface UpdateExpenseInput {
  amount?: number;
  payeeId?: string;
  description?: string;
  location?: string;
  date?: Date;
  envelopeId?: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceType;
}

export interface CreatePayeeInput {
  name: string;
  budgetId: string;
}

export interface InviteMemberInput {
  email: string;
  role: Role;
}
