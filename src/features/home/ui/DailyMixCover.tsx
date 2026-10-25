import { memo } from "react";
import CoverImage from "@/features/covers/ui/CoverImage";
import wavenLogo from "@/assets/waven-logo.png";

export interface DailyMixCoverProps {
  coverUrl?: string;
  mixNumber: string | number;
  imageLoaded: boolean;
  onLoad?: () => void;
}

function DailyMixCover({
  coverUrl,
  mixNumber,
  imageLoaded,
  onLoad,
}: DailyMixCoverProps) {
  return (
    <div
      className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-border-alpha-14 select-none"
      data-mix={mixNumber}
    >
      {coverUrl && (
        <CoverImage
          src={coverUrl}
          alt="Mix Cover"
          fill
          sizes="175px"
          className={`object-cover transition-all duration-300 group-hover:scale-[1.03] ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={onLoad}
        />
      )}

      {/* soft fade so the logo reads on any artwork */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-black/35 to-transparent" />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[10px] top-[10px] h-[11px] w-[30px] bg-white/85"
        style={{
          maskImage: `url(${wavenLogo})`,
          WebkitMaskImage: `url(${wavenLogo})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        }}
      />
    </div>
  );
}

export default memo(DailyMixCover);
