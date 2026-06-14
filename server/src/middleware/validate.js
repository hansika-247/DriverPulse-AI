import Joi from 'joi';

/**
 * Request validation middleware factory.
 * Usage: validate(schema) — validates req.body against a Joi schema.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,      // collect all errors
    stripUnknown: true,     // remove unknown fields
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  req.body = value; // replace with sanitized value
  next();
};

// ── Auth Schemas ────────────────────────────────────────────

export const signupSchema = Joi.object({
  name:          Joi.string().min(2).max(100).required(),
  email:         Joi.string().email().required(),
  phone:         Joi.string().min(7).max(20).required(),
  username:      Joi.string().alphanum().min(3).max(30).required(),
  password:      Joi.string().min(8).max(72).required(),
  vehicleNumber: Joi.string().min(2).max(20).required(),
  vehicleType:   Joi.string().valid('sedan', 'suv', 'hatchback', 'truck', 'van', 'motorcycle', 'other').required(),
  // driverId is user-supplied; optional — auto-generated if omitted
  driverId:      Joi.string().min(3).max(30).pattern(/^[A-Za-z0-9]+$/).optional(),
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required().messages({
    'string.empty': 'Username or Driver ID is required',
  }),
  password: Joi.string().required(),
});

// ── Chat Schema ─────────────────────────────────────────────

export const chatSchema = Joi.object({
  question: Joi.string().min(1).max(2000).required(),
});

export default validate;
