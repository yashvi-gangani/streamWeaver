const jobs = new Map();

export const JOB_STATUS = {
  CREATED: "created",
  UPLOADING: "uploading",
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed"
};

export const createJob = (jobId) => {
  const job = {
    jobId,
    status: JOB_STATUS.CREATED,
    filename: null,
path: null,
fileSize: 0,
    rowsProcessed: 0,
    rowsPerSecond: 0,
    percent: 0,
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(jobId, job);

  return job;
};

export const updateJob = (jobId, updates) => {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  jobs.set(jobId, updatedJob);

  return updatedJob;
};

export const getJob = (jobId) => {
  return jobs.get(jobId) || null;
};

export const updateProcessingProgress = (
  jobId,
  rowsProcessed,
  rowsPerSecond,
  percent
) => {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  return updateJob(jobId, {
    status: JOB_STATUS.PROCESSING,
    rowsProcessed,
    rowsPerSecond,
    percent
  });
};

export const completeJob = (
  jobId,
  rowsProcessed,
  rowsPerSecond
) => {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  return updateJob(jobId, {
    status: JOB_STATUS.COMPLETED,
    rowsProcessed,
    rowsPerSecond,
    percent: 100
  });
};

export const failJob = (jobId, errorMessage) => {
  const job = jobs.get(jobId);

  if (!job) {
    return null;
  }

  return updateJob(jobId, {
    status: JOB_STATUS.FAILED,
    errors: [errorMessage]
  });
};