const Joi = require("joi");
const {
  VOUCHER_TYPES,
  VOUCHER_APPLY_TO,
  PERCENTAGE,
  FIXED,
} = require("../constants/voucher.constant");

const MAX_NUMBER = Number.MAX_SAFE_INTEGER;

const now = new Date();
now.setHours(0, 0, 0, 0);

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const createVoucherValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên voucher phải là chuỗi",
    "string.empty": "Tên voucher không được để trống",
    "string.min": "Tên voucher phải có ít nhất {#limit} ký tự",
    "string.max": "Tên voucher không được vượt quá {#limit} ký tự",
    "any.required": "Tên voucher là bắt buộc",
  }),

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.empty": "Mô tả không được để trống",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  type: Joi.string()
    .trim()
    .valid(...VOUCHER_TYPES)
    .required()
    .messages({
      "string.base": "Loại giảm giá phải là chuỗi",
      "any.only": `Loại giảm giá chỉ được là: ${VOUCHER_TYPES.join(", ")}`,
      "any.required": "Loại giảm giá là bắt buộc",
    }),

  value: Joi.number()
    .positive()
    .max(MAX_NUMBER)
    .required()
    .when("type", {
      is: PERCENTAGE,
      then: Joi.number().max(100).messages({
        "number.max": "Giá trị phần trăm không được lớn hơn 100",
      }),
    })
    .messages({
      "number.base": "Giá trị giảm phải là số",
      "number.positive": "Giá trị giảm phải lớn hơn 0",
      "number.max": "Giá trị giảm không được vượt quá 16 chữ số",
      "any.required": "Giá trị giảm là bắt buộc",
    }),

  minValue: Joi.number().min(0).max(MAX_NUMBER).required().messages({
    "number.base": "Giá trị tối thiểu phải là số",
    "number.min": "Giá trị tối thiểu không được âm",
    "number.max": "Giá trị tối thiểu không được vượt quá 16 chữ số",
    "any.required": "Giá trị tối thiểu là bắt buộc",
  }),

  maxValue: Joi.number()
    .required()
    .when("type", {
      is: FIXED,
      then: Joi.valid(Joi.ref("value")).messages({
        "any.only":
          "Với loại giảm cố định, giá trị tối đa phải bằng giá trị giảm",
      }),
    })
    .min(0)
    .max(MAX_NUMBER)
    .messages({
      "number.base": "Giá trị tối đa phải là số",
      "number.min": "Giá trị tối đa phải >= 0",
      "number.max": "Giá trị tối đa không được vượt quá 16 chữ số",
      "any.required": "Giá trị tối đa là bắt buộc",
    }),

  validFrom: Joi.date()
    .min(tomorrow)
    .required()
    .custom((value) => {
      return normalizeDate(value);
    })
    .messages({
      "date.base": "Ngày bắt đầu phải là ngày hợp lệ",
      "date.min": "Ngày bắt đầu phải từ ngày mai trở đi",
      "any.required": "Ngày bắt đầu là bắt buộc",
    }),

  validTo: Joi.date()
    .required()
    .custom((value) => {
      return normalizeDate(value);
    })
    .messages({
      "date.base": "Ngày kết thúc phải là ngày hợp lệ",
      "any.required": "Ngày kết thúc là bắt buộc",
    }),

  applyTo: Joi.string()
    .trim()
    .valid(...VOUCHER_APPLY_TO)
    .required()
    .messages({
      "string.base": "Trường áp dụng phải là chuỗi",
      "any.only": `Trường áp dụng chỉ được là: ${VOUCHER_APPLY_TO.join(", ")}`,
      "any.required": "Trường áp dụng là bắt buộc",
    }),

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

const updateVoucherValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên voucher phải là chuỗi",
    "string.empty": "Tên voucher không được để trống",
    "string.min": "Tên voucher phải có ít nhất {#limit} ký tự",
    "string.max": "Tên voucher không được vượt quá {#limit} ký tự",
    "any.required": "Tên voucher là bắt buộc",
  }),

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.empty": "Mô tả không được để trống",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  type: Joi.string()
    .trim()
    .valid(...VOUCHER_TYPES)
    .required()
    .messages({
      "string.base": "Loại giảm giá phải là chuỗi",
      "any.only": `Loại giảm giá chỉ được là: ${VOUCHER_TYPES.join(", ")}`,
      "any.required": "Loại giảm giá là bắt buộc",
    }),

  value: Joi.number()
    .positive()
    .max(MAX_NUMBER)
    .required()
    .when("type", {
      is: PERCENTAGE,
      then: Joi.number().max(100).messages({
        "number.max": "Giá trị phần trăm không được lớn hơn 100",
      }),
    })
    .messages({
      "number.base": "Giá trị giảm phải là số",
      "number.positive": "Giá trị giảm phải lớn hơn 0",
      "number.max": "Giá trị giảm không được vượt quá 16 chữ số",
      "any.required": "Giá trị giảm là bắt buộc",
    }),

  minValue: Joi.number().min(0).max(MAX_NUMBER).required().messages({
    "number.base": "Giá trị tối thiểu phải là số",
    "number.min": "Giá trị tối thiểu không được âm",
    "number.max": "Giá trị tối thiểu không được vượt quá 16 chữ số",
    "any.required": "Giá trị tối thiểu là bắt buộc",
  }),

  maxValue: Joi.number()
    .required()
    .when("type", {
      is: FIXED,
      then: Joi.valid(Joi.ref("value")).messages({
        "any.only":
          "Với loại giảm cố định, giá trị tối đa phải bằng giá trị giảm",
      }),
    })
    .min(0)
    .max(MAX_NUMBER)
    .messages({
      "number.base": "Giá trị tối đa phải là số",
      "number.min": "Giá trị tối đa phải >= 0",
      "number.max": "Giá trị tối đa không được vượt quá 16 chữ số",
      "any.required": "Giá trị tối đa là bắt buộc",
    }),

  validFrom: Joi.date()
    .required()
    .custom((value) => {
      return normalizeDate(value);
    })
    .messages({
      "date.base": "Ngày bắt đầu phải là ngày hợp lệ",
      "any.required": "Ngày bắt đầu là bắt buộc",
    }),

  validTo: Joi.date()
    .required()
    .custom((value) => {
      return normalizeDate(value);
    })
    .messages({
      "date.base": "Ngày kết thúc phải là ngày hợp lệ",
      "any.required": "Ngày kết thúc là bắt buộc",
    }),

  applyTo: Joi.string()
    .trim()
    .valid(...VOUCHER_APPLY_TO)
    .required()
    .messages({
      "string.base": "Trường áp dụng phải là chuỗi",
      "any.only": `Trường áp dụng chỉ được là: ${VOUCHER_APPLY_TO.join(", ")}`,
      "any.required": "Trường áp dụng là bắt buộc",
    }),

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

module.exports = { createVoucherValidation, updateVoucherValidation };
