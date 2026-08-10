import { useEffect, useState } from "react";
import { socket } from "../services/socket";

export const useProcessingProgress = (jobId) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!jobId) return;

    socket.connect();
    socket.emit("join-processing-job", jobId);

    const handleProgress = (data) => {
      if (data.jobId === jobId) {
        setProgress(data.percent ?? 0);
      }
    };

    socket.on("processing-progress", handleProgress);

    return () => {
      socket.off("processing-progress", handleProgress);
      socket.disconnect();
    };
  }, [jobId]);

  return progress;
};
