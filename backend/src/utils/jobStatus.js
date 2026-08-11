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