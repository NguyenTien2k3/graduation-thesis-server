const Joi = require("joi");
const {
  DISCOUNT_TYPES,
  PERCENTAGE,
} = require("../constants/discount.constant");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

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

const createDiscountValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên discount phải là chuỗi",
    "string.empty": "Tên discount không được để trống",
    "string.min": "Tên discount phải có ít nhất {#limit} ký tự",
    "string.max": "Tên discount không được vượt quá {#limit} ký tự",
    "any.required": "Tên discount là bắt buộc",
  }),

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  type: Joi.string()
    .valid(...DISCOUNT_TYPES)
    .required()
    .messages({
      "string.base": "Loại giảm giá phải là chuỗi",
      "any.only": `Loại giảm giá chỉ được là: ${DISCOUNT_TYPES.join(", ")}`,
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

  productIds: Joi.array()
    .items(Joi.string().regex(objectIdPattern))
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách sản phẩm phải là một mảng",
      "array.min": "Danh sách sản phẩm phải có ít nhất {#limit} phần tử",
      "string.pattern.base": "Mỗi productId phải là ObjectId hợp lệ",
      "any.required": "Danh sách sản phẩm là bắt buộc",
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

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

const updateDiscountValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên discount phải là chuỗi",
    "string.empty": "Tên discount không được để trống",
    "string.min": "Tên discount phải có ít nhất {#limit} ký tự",
    "string.max": "Tên discount không được vượt quá {#limit} ký tự",
    "any.required": "Tên discount là bắt buộc",
  }),

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  type: Joi.string()
    .valid(...DISCOUNT_TYPES)
    .required()
    .messages({
      "string.base": "Loại giảm giá phải là chuỗi",
      "any.only": `Loại giảm giá chỉ được là: ${DISCOUNT_TYPES.join(", ")}`,
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

  productIds: Joi.array()
    .items(Joi.string().regex(objectIdPattern))
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách sản phẩm phải là một mảng",
      "array.min": "Danh sách sản phẩm phải có ít nhất {#limit} phần tử",
      "string.pattern.base": "Mỗi productId phải là ObjectId hợp lệ",
      "any.required": "Danh sách sản phẩm là bắt buộc",
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

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

module.exports = { createDiscountValidation, updateDiscountValidation };
