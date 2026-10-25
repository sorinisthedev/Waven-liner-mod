import type { ReactNode } from "react";

export interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** kept for callers; the minimal home page doesn't draw section icons */
  icon?: ReactNode;
  badge?: ReactNode;
  marginTop?: string;
}

export function SectionHeading({
  title,
  subtitle,
  badge,
  marginTop = "mt-[36px]",
}: SectionHeadingProps) {
  return (
    <div className={`${marginTop} px-3 flex items-end justify-between`}>
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-2">
          <h2 className="m-0 text-[19px] font-[650] leading-tight tracking-[-0.02em] text-text-primary">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="m-0 text-[13px] font-normal text-text-tertiary">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export default SectionHeading;
