/**
 * Validates request body/query/params against a Joi schema.
 * @param {Object} schema - Joi schema object with optional keys: body, query, params
 */
const validate = (schema) => (req, res, next) => {
  ['body', 'query', 'params'].forEach((key) => {
    if (!schema[key]) return;

    const { error, value } = schema[key].validate(req[key], {
      abortEarly: false,
      stripUnknown: false,
      convert: true,
    });

    if (!error) {
      req[key] = value;
    }
  });

  next();
};

module.exports = validate;
