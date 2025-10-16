const Joi = require("joi");

const phoneRegex = /^(0[3|5|7|8|9][0-9]{8}|\+84[3|5|7|8|9][0-9]{8})$/;

const createSupplierValidation = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    "string.base": "Tên nhà cung cấp phải là chuỗi",
    "string.empty": "Tên nhà cung cấp không được để trống",
    "string.min": "Tên nhà cung cấp phải có ít nhất {#limit} ký tự",
    "string.max": "Tên nhà cung cấp không được vượt quá {#limit} ký tự",
    "any.required": "Tên nhà cung cấp là bắt buộc",
  }),

  shortName: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Tên viết tắt phải là chuỗi",
    "string.min": "Tên viết tắt phải có ít nhất {#limit} ký tự",
    "string.max": "Tên viết tắt không được vượt quá {#limit} ký tự",
    "any.required": "Tên viết tắt là bắt buộc",
  }),

  contactPersonName: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên người liên hệ phải là chuỗi",
    "string.min": "Tên người liên hệ phải có ít nhất {#limit} ký tự",
    "string.max": "Tên người liên hệ không được vượt quá {#limit} ký tự",
    "any.required": "Tên người liên hệ là bắt buộc",
  }),

  phone: Joi.string().pattern(phoneRegex).required().messages({
    "string.base": "Số điện thoại phải là chuỗi",
    "string.empty": "Số điện thoại không được để trống",
    "string.pattern.base":
      "Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxx)",
    "any.required": "Số điện thoại là bắt buộc",
  }),

  email: Joi.string().email().required().messages({
    "string.base": "Email phải là chuỗi",
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
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

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

const updateSupplierValidation = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    "string.base": "Tên nhà cung cấp phải là chuỗi",
    "string.empty": "Tên nhà cung cấp không được để trống",
    "string.min": "Tên nhà cung cấp phải có ít nhất {#limit} ký tự",
    "string.max": "Tên nhà cung cấp không được vượt quá {#limit} ký tự",
    "any.required": "Tên nhà cung cấp là bắt buộc",
  }),

  shortName: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Tên viết tắt phải là chuỗi",
    "string.min": "Tên viết tắt phải có ít nhất {#limit} ký tự",
    "string.max": "Tên viết tắt không được vượt quá {#limit} ký tự",
    "any.required": "Tên viết tắt là bắt buộc",
  }),

  contactPersonName: Joi.string().trim().min(2).max(100).required().messages({
    "string.base": "Tên người liên hệ phải là chuỗi",
    "string.min": "Tên người liên hệ phải có ít nhất {#limit} ký tự",
    "string.max": "Tên người liên hệ không được vượt quá {#limit} ký tự",
    "any.required": "Tên người liên hệ là bắt buộc",
  }),

  phone: Joi.string().pattern(phoneRegex).required().messages({
    "string.base": "Số điện thoại phải là chuỗi",
    "string.empty": "Số điện thoại không được để trống",
    "string.pattern.base":
      "Số điện thoại không hợp lệ (VD: 0xxxxxxxxx hoặc +84xxxxxxxx)",
    "any.required": "Số điện thoại là bắt buộc",
  }),

  email: Joi.string().email().required().messages({
    "string.base": "Email phải là chuỗi",
    "string.empty": "Email không được để trống",
    "string.email": "Email không hợp lệ",
    "any.required": "Email là bắt buộc",
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

  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),

  isActive: Joi.boolean().default(true).messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
  }),
});

module.exports = {
  createSupplierValidation,
  updateSupplierValidation,
};
