import { FoodScanFlow } from "@/features/nutrition/scan/FoodScanFlow";

// Full-screen AI food scan: camera/gallery → analyze → editable result → log.
// All logic lives in the feature module; this route is just composition.
export default function FoodScanScreen() {
  return <FoodScanFlow />;
}
