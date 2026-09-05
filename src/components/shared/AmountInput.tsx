"use client";

import { NumberInput, type NumberInputProps } from "@mantine/core";

/**
 * A Mantine NumberInput that selects its current contents on focus.
 *
 * This lets users type a new value directly over the existing one (e.g. the
 * default "0.00") instead of having to manually delete the leading zeros.
 */
export function AmountInput(props: NumberInputProps) {
  return (
    <NumberInput
      {...props}
      onFocus={(event) => {
        event.currentTarget.select();
        props.onFocus?.(event);
      }}
    />
  );
}
