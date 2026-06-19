import type { Role } from "@prisma/client";

export function isAdminRole(role: Role | undefined | null): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function canManageBudget(role: Role | undefined | null): boolean {
  return isAdminRole(role);
}

export function canManageEnvelope(
  budgetRole: Role | undefined | null,
  envelopeRole: Role | undefined | null
): boolean {
  return isAdminRole(budgetRole) || isAdminRole(envelopeRole);
}

export function getMembershipRole<T extends { userId: string; role: Role }>(
  members: T[] | undefined,
  userId: string | undefined
): Role | undefined {
  if (!members || !userId) return undefined;
  return members.find((member) => member.userId === userId)?.role;
}
