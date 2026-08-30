import type { TablerIcon } from "@tabler/icons-react";
import {
  IconBabyCarriage,
  IconBarbell,
  IconBeach,
  IconBook,
  IconBuildingBank,
  IconCar,
  IconCoffee,
  IconDeviceGamepad2,
  IconDeviceMobile,
  IconDots,
  IconGift,
  IconHeart,
  IconHome,
  IconMedicalCross,
  IconMovie,
  IconMusic,
  IconPigMoney,
  IconPlane,
  IconReceipt,
  IconSchool,
  IconShirt,
  IconShoppingCart,
  IconToolsKitchen2,
  IconWallet,
  IconBolt,
  IconGasStation,
  IconPaw,
} from "@tabler/icons-react";

export const ENVELOPE_ICONS = [
  { name: "wallet", label: "Wallet", icon: IconWallet },
  { name: "shopping-cart", label: "Groceries", icon: IconShoppingCart },
  { name: "tools-kitchen-2", label: "Dining", icon: IconToolsKitchen2 },
  { name: "coffee", label: "Coffee", icon: IconCoffee },
  { name: "bolt", label: "Utilities", icon: IconBolt },
  { name: "car", label: "Transport", icon: IconCar },
  { name: "gas-station", label: "Gas", icon: IconGasStation },
  { name: "movie", label: "Entertainment", icon: IconMovie },
  { name: "music", label: "Music", icon: IconMusic },
  { name: "device-gamepad-2", label: "Gaming", icon: IconDeviceGamepad2 },
  { name: "heart", label: "Health", icon: IconHeart },
  { name: "medical-cross", label: "Medical", icon: IconMedicalCross },
  { name: "barbell", label: "Fitness", icon: IconBarbell },
  { name: "home", label: "Home", icon: IconHome },
  { name: "building-bank", label: "Banking", icon: IconBuildingBank },
  { name: "receipt", label: "Bills", icon: IconReceipt },
  { name: "pig-money", label: "Savings", icon: IconPigMoney },
  { name: "plane", label: "Travel", icon: IconPlane },
  { name: "beach", label: "Vacation", icon: IconBeach },
  { name: "gift", label: "Gifts", icon: IconGift },
  { name: "school", label: "Education", icon: IconSchool },
  { name: "book", label: "Books", icon: IconBook },
  { name: "baby-carriage", label: "Baby", icon: IconBabyCarriage },
  { name: "paw", label: "Pets", icon: IconPaw },
  { name: "shirt", label: "Clothing", icon: IconShirt },
  { name: "device-mobile", label: "Phone", icon: IconDeviceMobile },
  { name: "dots", label: "Other", icon: IconDots },
] as const;

export type EnvelopeIconName = (typeof ENVELOPE_ICONS)[number]["name"];

const iconByName = new Map<string, TablerIcon>(
  ENVELOPE_ICONS.map((entry) => [entry.name, entry.icon])
);

export const ENVELOPE_ICON_NAMES = ENVELOPE_ICONS.map((entry) => entry.name);

export function isEnvelopeIconName(value: string): value is EnvelopeIconName {
  return iconByName.has(value);
}

export function getEnvelopeIcon(name: string | null | undefined): TablerIcon {
  if (!name) return IconWallet;
  return iconByName.get(name) ?? IconWallet;
}
