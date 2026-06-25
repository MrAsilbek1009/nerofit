import { useUserId } from "@/hooks/useUser";
import { useProfile } from "@/lib/queries/profile";
import { useEntitlementStore } from "@/store/entitlement";

// True when the user is "elite" — either RevenueCat reports the entitlement
// (when configured) OR profiles.subscription_tier is "elite". The DB fallback
// means gating works before RevenueCat is wired up and survives a RevenueCat
// webhook updating the tier server-side.
export function useIsElite(): boolean {
  const rcElite = useEntitlementStore((s) => s.rcElite);
  const userId = useUserId();
  const profile = useProfile(userId);
  const tierElite = (profile.data?.subscription_tier ?? "free") === "elite";
  return rcElite || tierElite;
}
