import { Stack, Text } from "@mantine/core";
import { formatCurrency } from "@/lib/client-utils";
import { getRefundSummary, type AmountLike, type RefundAmountLike } from "@/lib/refunds";

interface ExpenseAmountCellProps {
  expense: { amount: AmountLike; refunds?: RefundAmountLike[] };
  currency?: string;
}

/**
 * An expense's amount in a table. Once refunded, the net cost leads and the
 * original amount is struck through beneath it, so the row still reconciles
 * against a receipt while the total that counts is the prominent one.
 */
export function ExpenseAmountCell({ expense, currency }: ExpenseAmountCellProps) {
  const { grossAmount, netAmount, status } = getRefundSummary(expense);

  if (status === "NONE") {
    return <Text fw={500}>{formatCurrency(grossAmount, currency)}</Text>;
  }

  return (
    <Stack gap={0} align="flex-end">
      <Text fw={500}>{formatCurrency(netAmount, currency)}</Text>
      <Text size="xs" c="dimmed" td="line-through">
        {formatCurrency(grossAmount, currency)}
      </Text>
    </Stack>
  );
}
