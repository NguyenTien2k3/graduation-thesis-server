const Joi = require("joi");
const { ORDER_PAYMENT_METHOD } = require("../constants/order.constant");
const { VOUCHER_APPLY_TO } = require("../constants/voucher.constant");
const { COUPON_APPLY_TO } = require("../constants/coupon.constant");

const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$/;

const attributeValidation = Joi.object({
  code: Joi.string().trim().required().messages({
    "string.base": "Mã thuộc tính phải là chuỗi",
    "string.empty": "Mã thuộc tính không được để trống",
    "any.required": "Mã thuộc tính là bắt buộc",
  }),
  value: Joi.string().trim().required().messages({
    "string.base": "Giá trị thuộc tính phải là chuỗi",
    "string.empty": "Giá trị thuộc tính không được để trống",
    "any.required": "Giá trị thuộc tính là bắt buộc",
  }),
});

const orderItemValidation = Joi.object({
  productItemId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "ID sản phẩm phải là chuỗi",
      "string.empty": "ID sản phẩm không được để trống",
      "string.pattern.base": "ID sản phẩm phải là ObjectId hợp lệ",
      "any.required": "ID sản phẩm là bắt buộc",
    }),

  name: Joi.string().trim().min(2).required().messages({
    "string.empty": "Tên sản phẩm không được để trống",
    "string.min": "Tên sản phẩm phải có ít nhất {#limit} ký tự",
    "any.required": "Tên sản phẩm là bắt buộc",
  }),

  attributes: Joi.array()
    .items(attributeValidation)
    .min(1)
    .required()
    .messages({
      "any.required": "Thuộc tính sản phẩm là bắt buộc",
      "array.min": "Thuộc tính sản phẩm phải có ít nhất 1 phần tử",
    }),

  image: Joi.string().uri().required().messages({
    "any.required": "Ảnh sản phẩm là bắt buộc",
    "string.uri": "Ảnh sản phẩm phải là một URL hợp lệ",
  }),

  originalPrice: Joi.number().positive().required().messages({
    "any.required": "Giá gốc là bắt buộc",
    "number.base": "Giá gốc phải là số",
    "number.positive": "Giá gốc phải lớn hơn 0",
  }),

  discountedPrice: Joi.number()
    .positive()
    .optional()
    .allow(null)
    .custom((value, helpers) => {
      const { originalPrice } = helpers.state.ancestors[0];
      if (value !== null && value > originalPrice) {
        return helpers.message("Giá khuyến mãi không được lớn hơn giá gốc");
      }
      return value;
    }),

  quantity: Joi.number().integer().min(1).required().messages({
    "any.required": "Số lượng là bắt buộc",
    "number.base": "Số lượng phải là số",
    "number.integer": "Số lượng phải là số nguyên",
    "number.min": "Số lượng phải ít nhất là 1",
  }),
});

const shippingAddressValidation = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Họ và tên không được để trống",
    "string.min": "Họ và tên phải có ít nhất {#limit} ký tự",
    "string.max": "Họ và tên không được vượt quá {#limit} ký tự",
    "any.required": "Họ và tên là bắt buộc",
  }),

  phone: Joi.string().trim().pattern(phoneRegex).required().messages({
    "string.base": "Số điện thoại phải là chuỗi",
    "string.empty": "Số điện thoại không được để trống",
    "string.pattern.base":
      "Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxx)",
    "any.required": "Số điện thoại là bắt buộc",
  }),

  addressLine: Joi.string().trim().min(5).max(200).required().messages({
    "string.base": "Địa chỉ chi tiết phải là chuỗi",
    "string.empty": "Địa chỉ chi tiết không được để trống",
    "string.min": "Địa chỉ chi tiết phải có ít nhất {#limit} ký tự",
    "string.max": "Địa chỉ chi tiết không được vượt quá {#limit} ký tự",
    "any.required": "Địa chỉ chi tiết là bắt buộc",
  }),

  ward: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Phường/Xã phải là chuỗi",
    "string.empty": "Phường/Xã không được để trống",
    "string.min": "Phường/Xã phải có ít nhất {#limit} ký tự",
    "string.max": "Phường/Xã không được vượt quá {#limit} ký tự",
    "any.required": "Phường/Xã là bắt buộc",
  }),

  district: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Quận/Huyện phải là chuỗi",
    "string.empty": "Quận/Huyện không được để trống",
    "string.min": "Quận/Huyện phải có ít nhất {#limit} ký tự",
    "string.max": "Quận/Huyện không được vượt quá {#limit} ký tự",
    "any.required": "Quận/Huyện là bắt buộc",
  }),

  province: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tỉnh/Thành phố phải là chuỗi",
    "string.empty": "Tỉnh/Thành phố không được để trống",
    "string.min": "Tỉnh/Thành phố phải có ít nhất {#limit} ký tự",
    "string.max": "Tỉnh/Thành phố không được vượt quá {#limit} ký tự",
    "any.required": "Tỉnh/Thành phố là bắt buộc",
  }),
});

const voucherItemValidation = Joi.object({
  userVoucherId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "userVoucherId phải là chuỗi",
      "string.empty": "userVoucherId không được để trống",
      "string.pattern.base": "userVoucherId phải là ObjectId hợp lệ",
      "any.required": "userVoucherId là bắt buộc",
    }),

  voucherApplyTo: Joi.string()
    .valid(...VOUCHER_APPLY_TO)
    .required()
    .messages({
      "any.only": `voucherApplyTo chỉ được là: ${VOUCHER_APPLY_TO.join(", ")}`,
      "any.required": "voucherApplyTo là bắt buộc",
    }),
});

const couponItemValidation = Joi.object({
  couponId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.base": "couponId phải là chuỗi",
      "string.empty": "couponId không được để trống",
      "string.pattern.base": "couponId phải là ObjectId hợp lệ",
      "any.required": "couponId là bắt buộc",
    }),

  couponApplyTo: Joi.string()
    .valid(...COUPON_APPLY_TO)
    .required()
    .messages({
      "any.only": `couponApplyTo chỉ được là: ${COUPON_APPLY_TO.join(", ")}`,
      "any.required": "couponApplyTo là bắt buộc",
    }),
});

const createOrderValidation = Joi.object({
  items: Joi.array().items(orderItemValidation).min(1).required().messages({
    "any.required": "Danh sách sản phẩm là bắt buộc",
    "array.min": "Cần có ít nhất 1 sản phẩm",
  }),

  shippingAddress: shippingAddressValidation.required().messages({
    "any.required": "Địa chỉ giao hàng là bắt buộc",
  }),

  totalAmount: Joi.number().positive().required().messages({
    "any.required": "Tổng tiền là bắt buộc",
    "number.base": "Tổng tiền phải là số",
    "number.positive": "Tổng tiền phải lớn hơn 0",
  }),

  paymentMethod: Joi.string()
    .valid(...ORDER_PAYMENT_METHOD)
    .required()
    .messages({
      "any.only": `Phương thức thanh toán chỉ được là: ${ORDER_PAYMENT_METHOD.join(
        ", "
      )}`,
      "any.required": "Phương thức thanh toán là bắt buộc",
    }),

  vouchers: Joi.array().items(voucherItemValidation).default([]),
  coupons: Joi.array().items(couponItemValidation).default([]),
});

module.exports = { createOrderValidation };
