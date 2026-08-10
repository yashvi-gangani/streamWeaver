const jobs = new Map();

export const createJob = (jobId) => {
  const job = {
    jobId,
    status: "created",
    rowsProcessed: 0,
    rowsPerSecond: 0,
    percent: 0,
    errors: []
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
    ...updates
  };

  jobs.set(jobId, updatedJob);

  return updatedJob;
};

export const getJob = (jobId) => {
  return jobs.get(jobId) || null;
};