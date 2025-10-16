const Joi = require("joi");
const {
  EXPORT_RECEIPT_REASON,
} = require("../constants/exportReceipt.constant");

const createExportReceiptValidation = Joi.object({
  branchId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "Branch ID phải là chuỗi",
      "string.empty": "Branch ID không được để trống",
      "string.pattern.base": "Branch ID phải là ObjectId hợp lệ",
      "any.required": "Branch ID là bắt buộc",
    }),

  items: Joi.array()
    .items(
      Joi.object({
        productItemId: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "string.base": "Product Item ID phải là chuỗi",
            "string.empty": "Product Item ID không được để trống",
            "string.pattern.base": "Product Item ID phải là ObjectId hợp lệ",
            "any.required": "Product Item ID là bắt buộc",
          }),
        quantity: Joi.number().integer().positive().required().messages({
          "number.base": "Số lượng phải là số",
          "number.integer": "Số lượng phải là số nguyên",
          "number.positive": "Số lượng phải lớn hơn 0",
          "any.required": "Số lượng là bắt buộc",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách items phải là một mảng",
      "array.min": "Danh sách items phải có ít nhất {#limit} phần tử",
      "any.required": "Danh sách items là bắt buộc",
    }),

  reason: Joi.string()
    .valid(...EXPORT_RECEIPT_REASON)
    .required()
    .messages({
      "string.base": "Lý do phải là chuỗi",
      "any.only": `Lý do chỉ được là: ${EXPORT_RECEIPT_REASON.join(", ")}`,
      "any.required": "Lý do là bắt buộc",
    }),

  note: Joi.string().trim().required().messages({
    "string.base": "Ghi chú phải là chuỗi",
    "any.required": "Ghi chú là bắt buộc",
  }),
});

const updateExportReceiptValidation = Joi.object({
  branchId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "Branch ID phải là chuỗi",
      "string.empty": "Branch ID không được để trống",
      "string.pattern.base": "Branch ID phải là ObjectId hợp lệ",
      "any.required": "Branch ID là bắt buộc",
    }),

  items: Joi.array()
    .items(
      Joi.object({
        productItemId: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            "string.base": "Product Item ID phải là chuỗi",
            "string.empty": "Product Item ID không được để trống",
            "string.pattern.base": "Product Item ID phải là ObjectId hợp lệ",
            "any.required": "Product Item ID là bắt buộc",
          }),
        quantity: Joi.number().integer().positive().required().messages({
          "number.base": "Số lượng phải là số",
          "number.integer": "Số lượng phải là số nguyên",
          "number.positive": "Số lượng phải lớn hơn 0",
          "any.required": "Số lượng là bắt buộc",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách items phải là một mảng",
      "array.min": "Danh sách items phải có ít nhất {#limit} phần tử",
      "any.required": "Danh sách items là bắt buộc",
    }),

  reason: Joi.string()
    .valid(...EXPORT_RECEIPT_REASON)
    .required()
    .messages({
      "string.base": "Lý do phải là chuỗi",
      "any.only": `Lý do chỉ được là: ${EXPORT_RECEIPT_REASON.join(", ")}`,
      "any.required": "Lý do là bắt buộc",
    }),

  note: Joi.string().trim().required().messages({
    "string.base": "Ghi chú phải là chuỗi",
    "any.required": "Ghi chú là bắt buộc",
  }),
});

module.exports = {
  createExportReceiptValidation,
  updateExportReceiptValidation,
};
