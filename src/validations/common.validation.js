const Joi = require("joi");

const objectIdRequiredValidation = Joi.string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    "string.base": "Trường này phải là chuỗi",
    "string.empty": "Trường này không được để trống",
    "string.pattern.base": "Trường này phải là ObjectId hợp lệ",
    "any.required": "Trường này là bắt buộc",
  });

const stringRequiredValidation = Joi.string()
  .trim()
  .required()
  .messages({
    "string.base": "Trường này phải là chuỗi",
    "string.empty": "Trường này không được để trống",
    "any.required": "Trường này là bắt buộc",
  });

const numberRequiredValidation = Joi.number().required().messages({
  "number.base": "Trường này phải là số",
  "number.empty": "Trường này không được để trống",
  "any.required": "Trường này là bắt buộc",
});

const emailRequiredValidation = Joi.string()
  .trim()
  .email()
  .required()
  .messages({
    "string.base": "Trường này phải là chuỗi",
    "string.empty": "Trường này không được để trống",
    "string.email": "Trường này phải là email hợp lệ",
    "any.required": "Trường này là bắt buộc",
  });

const passwordRequiredValidation = Joi.string()
  .trim()
  .pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  )
  .required()
  .messages({
    "string.base": "Trường này phải là chuỗi",
    "string.empty": "Trường này không được để trống",
    "string.pattern.base":
      "Trường này phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
    "any.required": "Trường này là bắt buộc",
  });

const booleanRequiredValidation = Joi.boolean().required().messages({
  "boolean.base": "isActive phải là true hoặc false",
  "any.required": "isActive là bắt buộc",
});

module.exports = {
  objectIdRequiredValidation,
  stringRequiredValidation,
  numberRequiredValidation,
  emailRequiredValidation,
  passwordRequiredValidation,
  booleanRequiredValidation,
};
