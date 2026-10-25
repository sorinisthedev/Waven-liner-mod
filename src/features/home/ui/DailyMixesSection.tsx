import { memo } from "react";
import ScrollableRow from "@/shared/ui/ScrollableRow";
import { useTranslation } from "@/languages";
import type { DailyMix } from "../hooks/useDailyMixes";
import DailyMixCard from "./DailyMixCard";
import SectionHeading from "./SectionHeading";

export interface DailyMixesSectionProps {
  mixes: DailyMix[];
  headingMarginTop?: string;
}

function DailyMixesSection({ mixes, headingMarginTop }: DailyMixesSectionProps) {
  const { t } = useTranslation();
  if (mixes.length === 0) return null;

  return (
    <section className="flex flex-col">
      <SectionHeading title={t("home.dailyMixes") || "Your Mixes"} marginTop={headingMarginTop} />
      <ScrollableRow className="flex gap-[20px] pl-3 pr-3 mt-[14px] overflow-x-auto pb-[2px]">
        {mixes.map((mix, index) => (
          <DailyMixCard key={`daily-mix-${mix.id}-${index}`} mix={mix} index={index} />
        ))}
      </ScrollableRow>
    </section>
  );
}

export default memo(DailyMixesSection);
