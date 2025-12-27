import Joi from 'joi';

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),
  createProject: Joi.object({
    name: Joi.string().max(255).required()
  }),
  createWorkspace: Joi.object({
    projectId: Joi.number().integer().required(),
    name: Joi.string().max(255).required()
  }),
  submitJob: Joi.object({
    workspaceId: Joi.number().integer().required(),
    input: Joi.object().required(),
    idempotencyKey: Joi.string().required()
  })
};

const validate =
  (schema) =>
  (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };

export default { schemas, validate };
