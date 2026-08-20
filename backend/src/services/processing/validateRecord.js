export const validateRecord = (record) => {
  if (!record || typeof record !== "object") {
    return {
      valid: false,
      error: "Record must be an object"
    };
  }

  const keys = Object.keys(record);

  if (keys.length === 0) {
    return {
      valid: false,
      error: "Record cannot be empty"
    };
  }

  return {
    valid: true,
    error: null
  };
};