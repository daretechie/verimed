import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_KEY: Joi.string().required().description('Global API Key for VeriMed'),
  DATABASE_URL: Joi.string().optional(),
  AI_API_KEY: Joi.string().optional(),
  JWT_SECRET: Joi.string().required(),
  ADMIN_USER: Joi.string().default('admin'),
  ADMIN_PASS: Joi.string().required(),
  LICENSE_KEY: Joi.string().optional(),
});
