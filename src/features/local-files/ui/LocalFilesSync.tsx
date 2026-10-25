import { useEffect } from "react";
import { useLocalFilesStore } from "../store/localFilesStore";

/** loads the music-folder scan at startup so local songs resolve everywhere */
export function LocalFilesSync() {
  useEffect(() => {
    void useLocalFilesStore.getState().load();
  }, []);
  return null;
}

export default LocalFilesSync;
