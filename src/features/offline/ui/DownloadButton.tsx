import { CheckCircleFill, CloseLine, Download2Line } from "@mingcute/react";
import { useTranslation } from "@/languages";
import { Button, showToast } from "@/shared/ui";
import type { Track } from "@/shared/types";
import { useOfflineStore } from "../store/offlineStore";

/** download a playlist or album for offline play; shows progress, then a check */
export function DownloadButton({
  collectionId,
  title,
  tracks,
  className = "",
}: {
  collectionId: string;
  title: string;
  tracks: Track[];
  className?: string;
}) {
  const { t } = useTranslation();
  const progress = useOfflineStore((s) => s.active[collectionId]);
  const saved = useOfflineStore((s) => s.collections[collectionId]);
  const download = useOfflineStore((s) => s.download);
  const cancel = useOfflineStore((s) => s.cancel);
  const remove = useOfflineStore((s) => s.remove);
  const missing = saved
    ? tracks.filter((tr) => !tr.id.startsWith("local:") && !saved.trackIds.includes(tr.id)).length
    : 0;

  if (progress) {
    return (
      <Button
        variant="secondary"
        onClick={() => cancel(collectionId)}
        title={t("offline.cancel")}
        data-testid="download-progress"
        className={`!h-[38px] !rounded-full !px-[14px] gap-[6px] ${className}`}
      >
        <span className="text-[12.5px] tabular-nums">
          {progress.done}/{progress.total}
        </span>
        <CloseLine size={14} />
      </Button>
    );
  }

  const label = saved
    ? missing
      ? t("offline.update", { count: missing })
      : t("offline.remove")
    : t("offline.download");

  return (
    <Button
      variant="secondary"
      size="icon"
      disabled={tracks.length === 0}
      aria-label={label}
      title={label}
      data-testid="download-button"
      onClick={async () => {
        if (saved && !missing) {
          await remove(collectionId);
          showToast(t("offline.removed", { title }), "info");
          return;
        }
        showToast(t("offline.started", { title }), "info");
        await download(collectionId, title, tracks);
        const after = useOfflineStore.getState().collections[collectionId];
        if (after) showToast(t("offline.finished", { title }), "success");
      }}
      className={`!h-[38px] !w-[38px] !rounded-full ${saved && !missing ? "!text-emerald-400" : ""} ${className}`}
    >
      {saved && !missing ? <CheckCircleFill size={18} /> : <Download2Line size={17} />}
    </Button>
  );
}

export default DownloadButton;
