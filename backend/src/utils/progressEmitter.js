// Member 4 owns this file.
//
// Emit processing progress through Socket.IO.
// Keep the event format stable.

export const emitProgress = (io, jobId, progress) => {
  io.to(jobId).emit("processing-progress", {
    jobId,
    ...progress
  });
};
