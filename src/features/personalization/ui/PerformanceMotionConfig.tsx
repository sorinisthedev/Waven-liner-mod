import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { usePersonalizationStore } from "../store/personalizationStore";

/** performance mode skips framer transform/layout animations, fades still run */
export function PerformanceMotionConfig({ children }: { children: ReactNode }) {
  const performanceMode = usePersonalizationStore((s) => s.performanceMode);
  return (
    <MotionConfig reducedMotion={performanceMode ? "always" : "user"}>{children}</MotionConfig>
  );
}

export default PerformanceMotionConfig;
