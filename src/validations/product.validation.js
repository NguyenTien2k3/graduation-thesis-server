const Joi = require("joi");
const { PRODUCT_ITEM_STATUS } = require("../constants/productItem.constant");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const productItemStatusRequiredValidation = Joi.string()
  .valid(...PRODUCT_ITEM_STATUS)
  .required()
  .messages({
    "string.base": "Trạng thái phải là chuỗi",
    "string.empty": "Trạng thái không được để trống",
    "any.only": `Trạng thái chỉ được là: ${PRODUCT_ITEM_STATUS.join(", ")}`,
    "any.required": "Trạng thái là bắt buộc",
  });

const attributeValidation = Joi.object({
  code: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Mã thuộc tính phải là chuỗi",
    "string.empty": "Mã thuộc tính không được để trống",
    "string.min": "Mã thuộc tính phải có ít nhất {#limit} ký tự",
    "string.max": "Mã thuộc tính không được vượt quá {#limit} ký tự",
    "any.required": "Mã thuộc tính là bắt buộc",
  }),
  value: Joi.string().trim().min(2).required().messages({
    "string.base": "Giá trị thuộc tính phải là chuỗi",
    "string.empty": "Giá trị thuộc tính không được để trống",
    "any.required": "Giá trị thuộc tính là bắt buộc",
  }),
});

const specificationItemValidation = Joi.object({
  label: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Label phải là chuỗi",
    "string.empty": "Label không được để trống",
    "string.min": "Label phải có ít nhất {#limit} ký tự",
    "string.max": "Label không được vượt quá {#limit} ký tự",
    "any.required": "Label là bắt buộc",
  }),
  value: Joi.string().trim().min(2).required().messages({
    "string.base": "Giá trị phải là chuỗi",
    "string.empty": "Giá trị không được để trống",
    "string.min": "Giá trị phải có ít nhất {#limit} ký tự",
    "any.required": "Giá trị là bắt buộc",
  }),
});

const specificationValidation = Joi.object({
  group: Joi.string().trim().min(2).max(50).required().messages({
    "string.base": "Group phải là chuỗi",
    "string.empty": "Group không được để trống",
    "string.min": "Group phải có ít nhất {#limit} ký tự",
    "string.max": "Group không được vượt quá {#limit} ký tự",
    "any.required": "Group là bắt buộc",
  }),
  items: Joi.array().items(specificationItemValidation).min(1).required().messages({
    "array.base": "Danh sách specification items phải là một mảng",
    "array.min":
      "Danh sách specification items phải có ít nhất {#limit} phần tử",
    "any.required": "Danh sách specification items là bắt buộc",
  }),
});

const baseCreateProductItemValidation = Joi.object({
  id: Joi.string().guid({ version: "uuidv4" }).required().messages({
    "string.base": "ID biến thể phải là chuỗi",
    "string.empty": "ID biến thể không được để trống",
    "string.guid": "ID biến thể phải là UUID hợp lệ",
    "any.required": "ID biến thể là bắt buộc",
  }),
  name: Joi.string().trim().min(2).required().messages({
    "string.base": "Tên biến thể phải là chuỗi",
    "string.empty": "Tên biến thể không được để trống",
    "string.min": "Tên biến thể phải có ít nhất {#limit} ký tự",
    "any.required": "Tên biến thể là bắt buộc",
  }),
  barcode: Joi.string().trim().min(3).max(100).required().messages({
    "string.base": "Barcode phải là chuỗi",
    "string.empty": "Barcode không được để trống",
    "string.min": "Barcode phải có ít nhất {#limit} ký tự",
    "string.max": "Barcode không được vượt quá {#limit} ký tự",
    "any.required": "Barcode là bắt buộc",
  }),
  attributes: Joi.array().items(attributeValidation).min(1).required().messages({
    "array.base": "Attributes phải là một mảng",
    "array.min": "Phải có ít nhất {#limit} attribute",
    "any.required": "Attributes là bắt buộc",
  }),
  specifications: Joi.array()
    .items(specificationValidation)
    .min(1)
    .required()
    .messages({
      "array.base": "Specifications phải là một mảng",
      "array.min": "Phải có ít nhất {#limit} specification group",
      "any.required": "Specifications là bắt buộc",
    }),
  status: productItemStatusRequiredValidation,
  retailPrice: Joi.number().positive().required().messages({
    "number.base": "Giá bán phải là số",
    "number.positive": "Giá bán phải lớn hơn 0",
    "any.required": "Giá bán là bắt buộc",
  }),
  purchasePrice: Joi.number().positive().required().messages({
    "number.base": "Giá nhập phải là số",
    "number.positive": "Giá nhập phải lớn hơn 0",
    "any.required": "Giá nhập là bắt buộc",
  }),
  supplierId: Joi.string().regex(objectIdRegex).required().messages({
    "string.base": "Supplier ID phải là chuỗi",
    "string.empty": "Supplier ID không được để trống",
    "string.pattern.base": "Supplier ID phải là ObjectId hợp lệ",
    "any.required": "Supplier ID là bắt buộc",
  }),
  branchId: Joi.string().regex(objectIdRegex).required().messages({
    "string.base": "Branch ID phải là chuỗi",
    "string.empty": "Branch ID không được để trống",
    "string.pattern.base": "Branch ID phải là ObjectId hợp lệ",
    "any.required": "Branch ID là bắt buộc",
  }),
  initialStock: Joi.number().integer().min(0).required().messages({
    "number.base": "Số lượng tồn ban đầu phải là số",
    "number.integer": "Số lượng tồn ban đầu phải là số nguyên",
    "number.min": "Số lượng tồn ban đầu không được nhỏ hơn 0",
    "any.required": "Số lượng tồn ban đầu là bắt buộc",
  }),
});

const baseUpdateProductItemValidation = Joi.object({
  _id: Joi.string().regex(objectIdRegex).optional().messages({
    "string.base": "ID phải là chuỗi",
    "string.pattern.base": "ID phải là ObjectId hợp lệ",
  }),
  name: Joi.string().trim().min(2).required().messages({
    "string.base": "Tên biến thể phải là chuỗi",
    "string.empty": "Tên biến thể không được để trống",
    "string.min": "Tên biến thể phải có ít nhất {#limit} ký tự",
    "any.required": "Tên biến thể là bắt buộc",
  }),
  barcode: Joi.string().trim().min(3).max(100).required().messages({
    "string.base": "Barcode phải là chuỗi",
    "string.empty": "Barcode không được để trống",
    "string.min": "Barcode phải có ít nhất {#limit} ký tự",
    "string.max": "Barcode không được vượt quá {#limit} ký tự",
    "any.required": "Barcode là bắt buộc",
  }),
  attributes: Joi.array().items(attributeValidation).min(1).required().messages({
    "array.base": "Attributes phải là một mảng",
    "array.min": "Phải có ít nhất {#limit} attribute",
    "any.required": "Attributes là bắt buộc",
  }),
  specifications: Joi.array()
    .items(specificationValidation)
    .min(1)
    .required()
    .messages({
      "array.base": "Specifications phải là một mảng",
      "array.min": "Phải có ít nhất {#limit} specification group",
      "any.required": "Specifications là bắt buộc",
    }),
  branchId: Joi.string().regex(objectIdRegex).required().messages({
    "string.base": "Branch ID phải là chuỗi",
    "string.empty": "Branch ID không được để trống",
    "string.pattern.base": "Branch ID phải là ObjectId hợp lệ",
    "any.required": "Branch ID là bắt buộc",
  }),
  status: productItemStatusRequiredValidation,
  retailPrice: Joi.number().positive().required().messages({
    "number.base": "Giá bán phải là số",
    "number.positive": "Giá bán phải lớn hơn 0",
    "any.required": "Giá bán là bắt buộc",
  }),
});

const productValidation = Joi.object({
  name: Joi.string().trim().min(2).required().messages({
    "string.base": "Tên sản phẩm phải là chuỗi",
    "string.empty": "Tên sản phẩm không được để trống",
    "string.min": "Tên sản phẩm phải có ít nhất {#limit} ký tự",
    "any.required": "Tên sản phẩm là bắt buộc",
  }),
  description: Joi.string().trim().min(10).required().messages({
    "string.base": "Mô tả phải là chuỗi",
    "string.empty": "Mô tả không được để trống",
    "string.min": "Mô tả phải có ít nhất {#limit} ký tự",
    "any.required": "Mô tả là bắt buộc",
  }),
  brandId: Joi.string().regex(objectIdRegex).required().messages({
    "string.base": "Brand ID phải là chuỗi",
    "string.empty": "Brand ID không được để trống",
    "string.pattern.base": "Brand ID phải là ObjectId hợp lệ",
    "any.required": "Brand ID là bắt buộc",
  }),
  categoryId: Joi.string().regex(objectIdRegex).required().messages({
    "string.base": "Category ID phải là chuỗi",
    "string.empty": "Category ID không được để trống",
    "string.pattern.base": "Category ID phải là ObjectId hợp lệ",
    "any.required": "Category ID là bắt buộc",
  }),
  videoUrl: Joi.string().uri().allow("").messages({
    "string.base": "Video URL phải là chuỗi",
    "string.uri": "Video URL không hợp lệ",
  }),
  isActive: Joi.boolean().required().messages({
    "boolean.base": "Trạng thái phải là true hoặc false",
    "any.required": "Trạng thái là bắt buộc",
  }),
});

const createProductValidation = Joi.object({
  product: productValidation.required().messages({
    "any.required": "Thông tin sản phẩm là bắt buộc",
  }),
  productItems: Joi.array()
    .items(baseCreateProductItemValidation)
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách biến thể phải là một mảng",
      "array.min": "Danh sách biến thể phải có ít nhất {#limit} phần tử",
      "any.required": "Danh sách biến thể là bắt buộc",
    }),
});

const updateProductValidation = Joi.object({
  product: productValidation.required().messages({
    "any.required": "Thông tin sản phẩm là bắt buộc",
  }),
  productItems: Joi.array()
    .items(baseUpdateProductItemValidation)
    .min(1)
    .required()
    .messages({
      "array.base": "Danh sách biến thể phải là một mảng",
      "array.min": "Danh sách biến thể phải có ít nhất {#limit} phần tử",
      "any.required": "Danh sách biến thể là bắt buộc",
    }),
  featuredImagesDelete: Joi.array()
    .items(
      Joi.string().pattern(/^.+$/).messages({
        "string.pattern.base":
          "Mỗi phần tử trong featuredImagesDelete phải là URL/đường dẫn hợp lệ",
      })
    )
    .required()
    .messages({
      "array.base": "featuredImagesDelete phải là một mảng",
      "any.required": "featuredImagesDelete là bắt buộc",
    }),
  productItemImagesDelete: Joi.array()
    .items(
      Joi.string().pattern(/^.+$/).messages({
        "string.pattern.base":
          "Mỗi phần tử trong productItemImagesDelete phải là URL/đường dẫn hợp lệ",
      })
    )
    .required()
    .messages({
      "array.base": "productItemImagesDelete phải là một mảng",
      "any.required": "productItemImagesDelete là bắt buộc",
    }),
});

const createProductItemValidation = Joi.object({
  productItem: baseCreateProductItemValidation.required().messages({
    "any.required": "Thông tin biến thể là bắt buộc",
  }),
});

const updateProductItemValidation = Joi.object({
  productItem: baseUpdateProductItemValidation.required().messages({
    "any.required": "Thông tin biến thể là bắt buộc",
  }),
});

module.exports = {
  createProductValidation,
  updateProductValidation,
  createProductItemValidation,
  updateProductItemValidation,
  productItemStatusRequiredValidation,
};
