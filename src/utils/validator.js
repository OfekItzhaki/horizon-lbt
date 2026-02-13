/**
 * Validate data against a Joi schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Joi schema
 * @returns {{valid: boolean, error?: string}} Validation result
 */
function validate(data, schema) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    return {
      valid: false,
      error: errorMessage
    };
  }
  
  return {
    valid: true,
    value
  };
}

module.exports = { validate };
