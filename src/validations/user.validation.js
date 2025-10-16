const Joi = require("joi");
const { USER_ROLE, USER_GENDER } = require("../constants/user.constant");

const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$/;

const baseUserValidation = {
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Họ phải là chuỗi",
    "string.empty": "Họ không được để trống",
    "string.min": "Họ phải có ít nhất {#limit} ký tự",
    "string.max": "Họ không được vượt quá {#limit} ký tự",
    "any.required": "Họ là bắt buộc",
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Tên phải là chuỗi",
    "string.empty": "Tên không được để trống",
    "string.min": "Tên phải có ít nhất {#limit} ký tự",
    "string.max": "Tên không được vượt quá {#limit} ký tự",
    "any.required": "Tên là bắt buộc",
  }),
  email: Joi.string().email().required().messages({
    "string.base": "Email phải là chuỗi",
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
  }),
  phone: Joi.string().pattern(phoneRegex).required().messages({
    "string.base": "Số điện thoại phải là chuỗi",
    "string.empty": "Số điện thoại không được để trống",
    "string.pattern.base":
      "Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxx)",
    "any.required": "Số điện thoại là bắt buộc",
  }),
  gender: Joi.string()
    .valid(...USER_GENDER)
    .required()
    .messages({
      "string.base": "Giới tính phải là chuỗi",
      "string.empty": "Giới tính không được để trống",
      "any.only": `Giới tính chỉ được là: ${USER_GENDER.join(", ")}`,
      "any.required": "Giới tính là bắt buộc",
    }),
  dateOfBirth: Joi.date().less("now").required().messages({
    "date.base": "Ngày sinh không hợp lệ",
    "date.empty": "Ngày sinh không được để trống",
    "date.less": "Ngày sinh phải nhỏ hơn ngày hiện tại",
    "any.required": "Ngày sinh là bắt buộc",
  }),
};

const registerValidation = Joi.object({
  ...baseUserValidation,
  password: Joi.string().min(6).max(100).required().messages({
    "string.base": "Mật khẩu phải là chuỗi",
    "string.empty": "Mật khẩu không được để trống",
    "string.min": "Mật khẩu phải có ít nhất {#limit} ký tự",
    "string.max": "Mật khẩu không được vượt quá {#limit} ký tự",
    "any.required": "Mật khẩu là bắt buộc",
  }),
});

const createManagerValidation = Joi.object({
  ...baseUserValidation,
  password: Joi.string().min(6).max(100).required().messages({
    "string.base": "Mật khẩu phải là chuỗi",
    "string.empty": "Mật khẩu không được để trống",
    "string.min": "Mật khẩu phải có ít nhất {#limit} ký tự",
    "string.max": "Mật khẩu không được vượt quá {#limit} ký tự",
    "any.required": "Mật khẩu là bắt buộc",
  }),
  role: Joi.string()
    .valid(...USER_ROLE)
    .required()
    .messages({
      "string.base": "Vai trò phải là chuỗi",
      "any.only": `Vai trò chỉ được là: ${USER_ROLE.join(", ")}`,
      "any.required": "Vai trò là bắt buộc",
    }),
});

const updateManagerValidation = Joi.object({
  ...baseUserValidation,
  password: Joi.string().min(6).max(100).optional().messages({
    "string.base": "Mật khẩu phải là chuỗi",
    "string.empty": "Mật khẩu không được để trống",
    "string.min": "Mật khẩu phải có ít nhất {#limit} ký tự",
    "string.max": "Mật khẩu không được vượt quá {#limit} ký tự",
  }),
  role: Joi.string()
    .valid(...USER_ROLE)
    .required()
    .messages({
      "string.base": "Vai trò phải là chuỗi",
      "any.only": `Vai trò chỉ được là: ${USER_ROLE.join(", ")}`,
      "any.required": "Vai trò là bắt buộc",
    }),
});

const updateUserCurrentValidation = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional().messages({
    "string.base": "Họ phải là chuỗi",
    "string.empty": "Họ không được để trống",
    "string.min": "Họ phải có ít nhất {#limit} ký tự",
    "string.max": "Họ không được vượt quá {#limit} ký tự",
  }),

  lastName: Joi.string().trim().min(2).max(50).optional().messages({
    "string.base": "Tên phải là chuỗi",
    "string.empty": "Tên không được để trống",
    "string.min": "Tên phải có ít nhất {#limit} ký tự",
    "string.max": "Tên không được vượt quá {#limit} ký tự",
  }),

  phone: Joi.string().pattern(phoneRegex).optional().messages({
    "string.pattern.base":
      "Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxx)",
    "string.empty": "Số điện thoại không được để trống",
  }),

  gender: Joi.string()
    .valid(...USER_GENDER)
    .optional()
    .messages({
      "string.base": "Giới tính phải là chuỗi",
      "string.empty": "Giới tính không được để trống",
      "any.only": `Giới tính chỉ được là: ${USER_GENDER.join(", ")}`,
    }),

  dateOfBirth: Joi.date().less("now").optional().messages({
    "date.base": "Ngày sinh không hợp lệ",
    "date.empty": "Ngày sinh không được để trống",
    "date.less": "Ngày sinh phải nhỏ hơn ngày hiện tại",
  }),

  avatar: Joi.string().uri().optional().messages({
    "string.base": "Avatar phải là chuỗi",
    "string.empty": "Avatar không được để trống",
    "string.uri": "Avatar phải là một URL hợp lệ",
  }),
});

module.exports = {
  registerValidation,
  createManagerValidation,
  updateManagerValidation,
  updateUserCurrentValidation,
};
