const Joi = require("joi");
const { ADDRESS_TYPES } = require("../constants/address.constant");

const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$/;

const createAddressValidation = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Họ và tên phải là chuỗi",
    "string.empty": "Họ và tên không được để trống",
    "string.min": "Họ và tên phải có ít nhất {#limit} ký tự",
    "string.max": "Họ và tên không được vượt quá {#limit} ký tự",
    "any.required": "Họ và tên là bắt buộc",
  }),

  phone: Joi.string().pattern(phoneRegex).required().messages({
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

  type: Joi.string()
    .valid(...ADDRESS_TYPES)
    .required()
    .messages({
      "string.base": "Loại địa chỉ phải là chuỗi",
      "any.only": `Loại địa chỉ chỉ được phép là: ${ADDRESS_TYPES.join(", ")}`,
      "any.required": "Loại địa chỉ là bắt buộc",
    }),

  location: Joi.object({
    type: Joi.string().valid("Point").required().messages({
      "string.base": "Loại địa chỉ phải là chuỗi",
      "any.only": "Trường location.type phải là 'Point'",
      "any.required": "Trường location.type là bắt buộc",
    }),
    coordinates: Joi.array()
      .ordered(
        Joi.number().min(-180).max(180).required().messages({
          "number.base": "Kinh độ phải là số",
          "number.min": "Kinh độ không nhỏ hơn -180",
          "number.max": "Kinh độ không lớn hơn 180",
          "any.required": "Kinh độ là bắt buộc",
        }),
        Joi.number().min(-90).max(90).required().messages({
          "number.base": "Vĩ độ phải là số",
          "number.min": "Vĩ độ không nhỏ hơn -90",
          "number.max": "Vĩ độ không lớn hơn 90",
          "any.required": "Vĩ độ là bắt buộc",
        })
      )
      .length(2)
      .required()
      .messages({
        "array.length":
          "Trường coordinates phải có đúng 2 phần tử [kinh độ, vĩ độ]",
        "any.required": "Trường coordinates là bắt buộc",
      }),
  })
    .unknown(false)
    .required()
    .messages({
      "any.required": "Trường location là bắt buộc",
    }),

  isDefault: Joi.boolean().default(false).messages({
    "boolean.base": "isDefault phải là true hoặc false",
  }),
});

const updateAddressValidation = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Họ và tên phải là chuỗi",
    "string.empty": "Họ và tên không được để trống",
    "string.min": "Họ và tên phải có ít nhất {#limit} ký tự",
    "string.max": "Họ và tên không được vượt quá {#limit} ký tự",
    "any.required": "Họ và tên là bắt buộc",
  }),

  phone: Joi.string().pattern(phoneRegex).required().messages({
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

  type: Joi.string()
    .valid(...ADDRESS_TYPES)
    .required()
    .messages({
      "string.base": "Loại địa chỉ phải là chuỗi",
      "any.only": `Loại địa chỉ chỉ được phép là: ${ADDRESS_TYPES.join(", ")}`,
      "any.required": "Loại địa chỉ là bắt buộc",
    }),

  location: Joi.object({
    type: Joi.string().valid("Point").required().messages({
      "string.base": "Loại địa chỉ phải là chuỗi",
      "any.only": "Trường location.type phải là 'Point'",
      "any.required": "Trường location.type là bắt buộc",
    }),
    coordinates: Joi.array()
      .ordered(
        Joi.number().min(-180).max(180).required().messages({
          "number.base": "Kinh độ phải là số",
          "number.min": "Kinh độ không nhỏ hơn -180",
          "number.max": "Kinh độ không lớn hơn 180",
          "any.required": "Kinh độ là bắt buộc",
        }),
        Joi.number().min(-90).max(90).required().messages({
          "number.base": "Vĩ độ phải là số",
          "number.min": "Vĩ độ không nhỏ hơn -90",
          "number.max": "Vĩ độ không lớn hơn 90",
          "any.required": "Vĩ độ là bắt buộc",
        })
      )
      .length(2)
      .required()
      .messages({
        "array.length":
          "Trường coordinates phải có đúng 2 phần tử [kinh độ, vĩ độ]",
        "any.required": "Trường coordinates là bắt buộc",
      }),
  })
    .unknown(false)
    .required()
    .messages({
      "any.required": "Trường location là bắt buộc",
    }),

  isDefault: Joi.boolean().default(false).messages({
    "boolean.base": "isDefault phải là true hoặc false",
  }),
});

module.exports = {
  createAddressValidation,
  updateAddressValidation,
};
