export const transformRecord = (record) => {
  const transformedRecord = {};

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = key.trim();

    if (!normalizedKey) {
      continue;
    }

    if (typeof value === "string") {
      transformedRecord[normalizedKey] = value.trim();
    } else if (value === null || value === undefined) {
      transformedRecord[normalizedKey] = null;
    } else {
      transformedRecord[normalizedKey] = value;
    }
  }

  return transformedRecord;
};

export const transformRecords = (records) => {
  if (!Array.isArray(records)) {
    throw new Error("Records must be an array");
  }

  return records.map(transformRecord);
};