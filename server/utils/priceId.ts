// server/utils/priceId.ts
import { ENV } from "../env";

export type Plan = "TRIAL"|"BASIC"|"SMALL"|"MEDIUM"|"LARGE"|"UNLIMITED";

const map: Record<Plan, string | undefined> = {
  TRIAL: ENV.PRICE_TRIAL,
  BASIC: ENV.PRICE_BASIC,
  SMALL: ENV.PRICE_SMALL,
  MEDIUM: ENV.PRICE_MEDIUM,
  LARGE: ENV.PRICE_LARGE,
  UNLIMITED: ENV.PRICE_UNLIMITED,
};

export function priceIdForPlan(plan: Plan): string {
  const id = map[plan as Plan];
  if (!id) throw new Error(`No price id configured for plan ${plan}`);
  return id;
}