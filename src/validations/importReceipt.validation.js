const Joi = require("joi");
const {
  IMPORT_RECEIPT_PAYMENT_METHOD,
} = require("../constants/importReceipt.constant");

const createImportReceiptValidation = Joi.object({
  supplierId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "Supplier ID phải là chuỗi",
      "string.empty": "Supplier ID không được để trống",
      "string.pattern.base": "Supplier ID phải là ObjectId hợp lệ",
      "any.required": "Supplier ID là bắt buộc",
    }),

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
        purchasePrice: Joi.number().positive().required().messages({
          "number.base": "Giá nhập phải là số",
          "number.positive": "Giá nhập phải lớn hơn 0",
          "any.required": "Giá nhập là bắt buộc",
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

  totalAmount: Joi.number().positive().required().messages({
    "number.base": "Tổng tiền phải là số",
    "number.positive": "Tổng tiền phải lớn hơn 0",
    "any.required": "Tổng tiền là bắt buộc",
  }),

  paymentMethod: Joi.string()
    .valid(...IMPORT_RECEIPT_PAYMENT_METHOD)
    .required()
    .messages({
      "string.base": "Phương thức thanh toán phải là chuỗi",
      "any.only": `Phương thức thanh toán chỉ được là: ${IMPORT_RECEIPT_PAYMENT_METHOD.join(
        ", "
      )}`,
      "any.required": "Phương thức thanh toán là bắt buộc",
    }),

  note: Joi.string().trim().required().messages({
    "string.base": "Ghi chú phải là chuỗi",
    "any.required": "Ghi chú là bắt buộc",
  }),
});

const updateImportReceiptValidation = Joi.object({
  supplierId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "Supplier ID phải là chuỗi",
      "string.empty": "Supplier ID không được để trống",
      "string.pattern.base": "Supplier ID phải là ObjectId hợp lệ",
      "any.required": "Supplier ID là bắt buộc",
    }),

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
        purchasePrice: Joi.number().positive().required().messages({
          "number.base": "Giá nhập phải là số",
          "number.positive": "Giá nhập phải lớn hơn 0",
          "any.required": "Giá nhập là bắt buộc",
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

  totalAmount: Joi.number().positive().required().messages({
    "number.base": "Tổng tiền phải là số",
    "number.positive": "Tổng tiền phải lớn hơn 0",
    "any.required": "Tổng tiền là bắt buộc",
  }),

  paymentMethod: Joi.string()
    .valid(...IMPORT_RECEIPT_PAYMENT_METHOD)
    .required()
    .messages({
      "string.base": "Phương thức thanh toán phải là chuỗi",
      "any.only": `Phương thức thanh toán chỉ được là: ${IMPORT_RECEIPT_PAYMENT_METHOD.join(
        ", "
      )}`,
      "any.required": "Phương thức thanh toán là bắt buộc",
    }),

  note: Joi.string().trim().required().messages({
    "string.base": "Ghi chú phải là chuỗi",
    "any.required": "Ghi chú là bắt buộc",
  }),
});

module.exports = {
  createImportReceiptValidation,
  updateImportReceiptValidation,
};
