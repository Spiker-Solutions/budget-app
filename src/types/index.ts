import type {
  User,
  Budget,
  Envelope,
  Expense,
  Refund,
  Payee,
  BudgetUser,
  EnvelopeUser,
  Role,
  PeriodType,
  RecurrenceType,
} from "@prisma/client";

export type { User, Budget, Envelope, Expense, Refund, Payee, BudgetUser, EnvelopeUser };
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

export type RefundWithRelations = Refund & {
  createdBy: Pick<User, "id" | "name" | "email" | "image">;
};

export type ExpenseWithRelations = Expense & {
  payee: Payee;
  envelope: Envelope;
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
  payee?: string;
  description?: string;
  location?: string;
  date?: Date;
  envelopeId?: string;
  budgetId?: string;
  isRecurring?: boolean;
  recurrence?: "NONE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
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
