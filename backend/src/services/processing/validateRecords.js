import { validateRecord } from "./validateRecord.js";

export const validateRecords = (records) => {
  const validRecords = [];
  const errors = [];

  records.forEach((record, index) => {
    const result = validateRecord(record);

    if (result.valid) {
      validRecords.push(record);
    } else {
      errors.push({
        row: index + 1,
        error: result.error
      });
    }
  });

  return {
    validRecords,
    errors
  };
};