export const emitProgress = (io, jobId, progress) => {
  io.to(jobId).emit("processing-progress", {
    jobId,
    ...progress
  });
};