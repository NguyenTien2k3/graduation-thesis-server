const axios = require("axios");
const slugify = require("slugify");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const productModel = require("../models/product.model");
const categoryModel = require("../models/category.model");
const brandModel = require("../models/brand.model");
const productItemModel = require("../models/productItem.model");
const inventoryModel = require("../models/inventory.model");
const inventoryTransactionModel = require("../models/inventoryTransaction.model");
const interactionModel = require("../models/interaction.model");
const supplierModel = require("../models/supplier.model");
const branchModel = require("../models/branch.model");
const natural = require("natural");
const TfIdf = natural.TfIdf;

const {
  uploadToCloudinary,
  deleteFromCloudinary,
  cleanupTempFiles,
} = require("../config/cloudinary.config");
const {
  generateSKU,
  generateBarcodeImageToCloudinary,
  normalizeName,
  toBoolean,
  escapeRegex,
} = require("../utils/common.util");
const { throwError } = require("../utils/handleError.util");

const createProductService = async ({
  product,
  productItems,
  thumbProduct,
  featuredImages,
  thumbProductItem,
  productItemImages,
}) => {
  const uploadedResources = [];
  let savedProduct = null;
  let savedItems = [];

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { brandId, categoryId, name } = product;

    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    const brandExists = await brandModel.findById(brandId).session(session);
    if (!brandExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }
    const categoryExists = await categoryModel
      .findById(categoryId)
      .session(session);
    if (!categoryExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    const normalizedName = normalizeName(name);
    const isExistProduct = await productModel
      .findOne({ normalizedName })
      .session(session);
    if (isExistProduct) {
      throw {
        status: 400,
        msg: "Tên sản phẩm đã tồn tại.",
      };
    }

    const uploadedThumb = await uploadImageAndTrack(
      thumbProduct.path,
      thumbProduct.mimetype,
      "/products/productThumbs"
    );

    let uploadedFeaturedImages = [];
    if (Array.isArray(featuredImages) && featuredImages.length > 0) {
      uploadedFeaturedImages = await Promise.all(
        featuredImages.map((image) =>
          uploadImageAndTrack(
            image.path,
            image.mimetype,
            "/products/productFeatured"
          )
        )
      ).then((results) =>
        results.map((uploaded) => ({
          image: uploaded.secure_url,
          imageFileName: uploaded.public_id,
        }))
      );
    }

    const slug = slugify(name, { lower: true, strict: true });
    const newProduct = new productModel({
      ...product,
      slug,
      normalizedName,
      thumbUrl: uploadedThumb.secure_url,
      thumbFileName: uploadedThumb.public_id,
      featuredImages: uploadedFeaturedImages,
    });

    savedProduct = await newProduct.save({ session });

    const thumbProductItemMap = {};
    thumbProductItem.forEach((file) => {
      const match = file.fieldname.match(/thumbProductItem\[(.+?)\]/);
      if (match) thumbProductItemMap[match[1]] = file;
    });

    const productItemImagesMap = {};
    productItemImages.forEach((file) => {
      const match = file.fieldname.match(/productItemImages\[(.+?)\]/);
      if (match) {
        const id = match[1];
        if (!productItemImagesMap[id]) productItemImagesMap[id] = [];
        productItemImagesMap[id].push(file);
      }
    });

    if (Array.isArray(productItems) && productItems.length > 0) {
      const itemsWithExtraFields = await Promise.all(
        productItems.map(async (item) => {
          let sku,
            attempt = 0;
          do {
            if (attempt++ > 5)
              throw {
                status: 400,
                msg: "Không thể tạo SKU duy nhất.",
              };
            sku = generateSKU();
          } while (await productItemModel.findOne({ sku }).session(session));

          const barcode = item.barcode;
          if (!barcode) {
            throw {
              status: 400,
              msg: "Mã vạch là bắt buộc cho sản phẩm.",
            };
          }

          const isExistBarcode = await productItemModel
            .findOne({ barcode })
            .session(session);
          if (isExistBarcode) {
            throw {
              status: 400,
              msg: `Mã vạch "${barcode}" đã tồn tại.`,
            };
          }

          if (!mongoose.isValidObjectId(item.supplierId)) {
            throw {
              status: 400,
              msg: `ID nhà cung cấp không hợp lệ.`,
            };
          }

          const supplierExists = await supplierModel
            .exists({ _id: item.supplierId })
            .session(session);
          if (!supplierExists) {
            throw {
              status: 400,
              msg: `Không tìm thấy nhà cung cấp.`,
            };
          }

          if (!mongoose.isValidObjectId(item.branchId)) {
            throw {
              status: 400,
              msg: `ID chi nhánh không hợp lệ.`,
            };
          }

          const branchExists = await branchModel
            .exists({ _id: item.branchId })
            .session(session);
          if (!branchExists) {
            throw {
              status: 400,
              msg: `Không tìm thấy chi nhánh.`,
            };
          }

          const itemName = item.name;
          if (!itemName) {
            throw {
              status: 400,
              msg: `Tên là bắt buộc cho sản phẩm con.`,
            };
          }

          const itemNormalizedName = normalizeName(itemName);

          const barcodeUpload = await generateBarcodeImageToCloudinary(barcode);
          uploadedResources.push(barcodeUpload.public_id);

          const thumb = thumbProductItemMap[item.id];
          let uploadedThumb = { secure_url: "", public_id: "" };
          if (thumb) {
            uploadedThumb = await uploadImageAndTrack(
              thumb.path,
              thumb.mimetype,
              "/products/itemThumbs"
            );
          }

          const featuredImages = productItemImagesMap[item.id] || [];
          const uploadedFeatured = await Promise.all(
            featuredImages.map((image) =>
              uploadImageAndTrack(
                image.path,
                image.mimetype,
                "/products/itemImages"
              )
            )
          ).then((results) =>
            results.map((uploaded) => ({
              image: uploaded.secure_url,
              imageFileName: uploaded.public_id,
            }))
          );

          return {
            productId: savedProduct._id,
            name: itemName,
            normalizedName: itemNormalizedName,
            sku,
            barcode,
            barcodeImageUrl: barcodeUpload.secure_url,
            barcodeFileName: barcodeUpload.public_id,
            retailPrice: item.retailPrice,
            thumbUrl: uploadedThumb.secure_url,
            thumbFileName: uploadedThumb.public_id,
            images: uploadedFeatured,
            attributes: item.attributes,
            specifications: item.specifications,
            status: item.status,
            _tempSupplier: item.supplierId,
            _tempBranch: item.branchId,
            _tempInitialStock: item.initialStock,
            _tempPurchasePrice: item.purchasePrice,
          };
        })
      );

      savedItems = await productItemModel.insertMany(itemsWithExtraFields, {
        session,
      });

      const inventoryData = savedItems.map((item, index) => ({
        productItemId: item._id,
        branchId: itemsWithExtraFields[index]._tempBranch,
        quantity: itemsWithExtraFields[index]._tempInitialStock,
      }));
      await inventoryModel.insertMany(inventoryData, { session });

      const transactionData = savedItems
        .map((item, index) => {
          const initialStock = itemsWithExtraFields[index]._tempInitialStock;
          if (initialStock > 0) {
            return {
              productItemId: item._id,
              type: "import",
              quantity: initialStock,
              purchasePrice: itemsWithExtraFields[index]._tempPurchasePrice,
              supplierId: itemsWithExtraFields[index]._tempSupplier,
              note: "Nhập kho ban đầu.",
            };
          }
          return null;
        })
        .filter(Boolean);

      if (transactionData.length > 0) {
        await inventoryTransactionModel.insertMany(transactionData, {
          session,
        });
      }

      savedItems = savedItems.map((item) => {
        const cleanItem = item.toObject();
        delete cleanItem._tempSupplier;
        delete cleanItem._tempBranch;
        delete cleanItem._tempInitialStock;
        delete cleanItem._tempPurchasePrice;
        return cleanItem;
      });
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Sản phẩm được tạo thành công.",
      product: savedProduct,
      productItems: savedItems,
    };
  } catch (error) {
    await session.abortTransaction();

    if (uploadedResources.length > 0) {
      try {
        await Promise.all(
          uploadedResources.map((id) => deleteFromCloudinary(id))
        );
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp tài nguyên đã tải lên:", cleanupError);
      }
    }

    if (savedProduct && savedProduct._id) {
      try {
        await productModel.deleteOne({ _id: savedProduct._id });
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp sản phẩm:", cleanupError);
      }
    }

    if (savedItems.length > 0) {
      const itemIds = savedItems.map((item) => item._id);
      try {
        await productItemModel.deleteMany({ _id: { $in: itemIds } });
        await inventoryModel.deleteMany({ productItemId: { $in: itemIds } });
        await inventoryTransactionModel.deleteMany({
          productItemId: { $in: itemIds },
        });
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp sản phẩm con:", cleanupError);
      }
    }

    console.error("Lỗi trong quá trình tạo sản phẩm:", error);
    throw throwError(error);
  } finally {
    session.endSession();
    await cleanupTempFiles([
      ...(thumbProduct ? [thumbProduct] : []),
      ...(featuredImages || []),
      ...(thumbProductItem || []),
      ...(productItemImages || []),
    ]);
  }
};

const createProductItemService = async ({
  productId,
  productItem,
  thumbProductItem,
  productItemImages,
}) => {
  const uploadedResources = [];
  let session;
  let savedItem;

  const uploadImageAndTrack = async (file, folder) => {
    const uploaded = await uploadToCloudinary(file.path, file.mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const product = await productModel.findById(productId).session(session);
    if (!product) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const barcode = productItem.barcode;
    if (!barcode) {
      throw {
        status: 400,
        msg: "Mã vạch là bắt buộc cho sản phẩm.",
      };
    }

    const isExistBarcode = await productItemModel
      .findOne({ barcode })
      .session(session);
    if (isExistBarcode) {
      throw {
        status: 400,
        msg: `Mã vạch "${barcode}" đã tồn tại.`,
      };
    }

    if (!mongoose.isValidObjectId(productItem.branchId)) {
      throw {
        status: 400,
        msg: "ID chi nhánh không hợp lệ.",
      };
    }

    const branchExists = await branchModel
      .exists({ _id: productItem.branchId })
      .session(session);
    if (!branchExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy chi nhánh.",
      };
    }

    if (!mongoose.isValidObjectId(productItem.supplierId)) {
      throw {
        status: 400,
        msg: "ID nhà cung cấp không hợp lệ.",
      };
    }

    const supplierExists = await supplierModel
      .exists({ _id: productItem.supplierId })
      .session(session);
    if (!supplierExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy nhà cung cấp.",
      };
    }

    let sku;
    let attempt = 0;
    do {
      if (attempt++ > 5) {
        throw {
          status: 400,
          msg: "Không thể tạo SKU duy nhất.",
        };
      }
      sku = generateSKU();
    } while (await productItemModel.findOne({ sku }).session(session));

    const itemName = productItem.name.trim();
    const itemNormalizedName = normalizeName(itemName);

    const barcodeUpload = await generateBarcodeImageToCloudinary(
      productItem.barcode
    );
    uploadedResources.push(barcodeUpload.public_id);

    const thumbProductItemMap = {};
    thumbProductItem.forEach((file) => {
      const match = file.fieldname.match(/thumbProductItem\[(.+?)\]/);
      if (match) thumbProductItemMap[match[1]] = file;
    });

    const productItemImagesMap = {};
    productItemImages.forEach((file) => {
      const match = file.fieldname.match(/productItemImages\[(.+?)\]/);
      if (match) {
        const id = match[1];
        if (!productItemImagesMap[id]) productItemImagesMap[id] = [];
        productItemImagesMap[id].push(file);
      }
    });

    const thumb = thumbProductItemMap[productItem.id];
    let uploadedThumb = { secure_url: "", public_id: "" };
    if (thumb) {
      uploadedThumb = await uploadImageAndTrack(thumb, "/products/itemThumbs");
    } else {
      throw {
        status: 400,
        msg: "Thiếu hình ảnh chính (thumbProductItem) cho sản phẩm con.",
      };
    }
    const featuredImages = productItemImagesMap[productItem.id] || [];
    const uploadedFeatured = await Promise.all(
      featuredImages.map((file) =>
        uploadImageAndTrack(file, "/products/itemImages")
      )
    ).then((results) =>
      results.map((uploaded) => ({
        image: uploaded.secure_url,
        imageFileName: uploaded.public_id,
      }))
    );

    const newItem = new productItemModel({
      productId: product._id,
      name: itemName,
      normalizedName: itemNormalizedName,
      sku,
      barcode: productItem.barcode,
      barcodeImageUrl: barcodeUpload.secure_url,
      barcodeFileName: barcodeUpload.public_id,
      retailPrice: productItem.retailPrice,
      thumbUrl: uploadedThumb.secure_url,
      thumbFileName: uploadedThumb.public_id,
      images: uploadedFeatured,
      attributes: productItem.attributes || [],
      specifications: productItem.specifications || [],
      status: productItem.status,
    });

    savedItem = await newItem.save({ session });

    await inventoryModel.create(
      [
        {
          productItemId: savedItem._id,
          branchId: productItem.branchId,
          quantity: productItem.initialStock || 0,
        },
      ],
      { session }
    );

    if (productItem.initialStock > 0) {
      await inventoryTransactionModel.create(
        [
          {
            productItemId: savedItem._id,
            type: "import",
            quantity: productItem.initialStock,
            purchasePrice: productItem.purchasePrice,
            branchId: productItem.branchId,
            supplierId: productItem.supplierId,
            note: "Nhập kho ban đầu.",
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return {
      success: true,
      msg: "Sản phẩm con được tạo thành công.",
      productItem: savedItem,
    };
  } catch (error) {
    console.error("Lỗi khi tạo sản phẩm con:", error);

    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Lỗi khi hủy giao dịch:", abortError);
      }
    }

    if (uploadedResources.length > 0) {
      try {
        await Promise.all(
          uploadedResources.map((id) => deleteFromCloudinary(id))
        );
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp tài nguyên đã tải lên:", cleanupError);
      }
    }

    if (savedItem) {
      try {
        await productItemModel.deleteOne({ _id: savedItem._id });
        await inventoryModel.deleteOne({ productItemId: savedItem._id });
        await inventoryTransactionModel.deleteOne({
          productItemId: savedItem._id,
        });
      } catch (dbCleanupError) {
        console.error("Lỗi khi dọn dẹp bản ghi cơ sở dữ liệu:", dbCleanupError);
      }
    }

    throw throwError(error);
  } finally {
    if (session) {
      session.endSession();
    }
    await cleanupTempFiles([
      ...(thumbProductItem ? [thumbProductItem] : []),
      ...(productItemImages || []),
    ]);
  }
};

const updateProductByIdService = async ({
  productId,
  product,
  productItems,
  thumbProduct,
  featuredImages,
  thumbProductItem,
  productItemImages,
  featuredImagesDelete,
  productItemImagesDelete,
}) => {
  const uploadedResources = [];
  let updatedProduct = null;
  let updatedItems = [];

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { brandId, categoryId, name } = product;

    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(brandId)) {
      throw {
        status: 400,
        msg: "ID thương hiệu không hợp lệ.",
      };
    }

    if (!mongoose.isValidObjectId(categoryId)) {
      throw {
        status: 400,
        msg: "ID danh mục không hợp lệ.",
      };
    }

    const brandExists = await brandModel
      .exists({ _id: brandId })
      .session(session);
    if (!brandExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy thương hiệu.",
      };
    }

    const categoryExists = await categoryModel
      .exists({ _id: categoryId })
      .session(session);
    if (!categoryExists) {
      throw {
        status: 404,
        msg: "Không tìm thấy danh mục.",
      };
    }

    const existingProduct = await productModel
      .findById(productId)
      .session(session);
    if (!existingProduct) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const updateData = { ...product };

    if (name && normalizeName(name) !== existingProduct.normalizedName) {
      const normalizedName = normalizeName(name);
      const isDuplicateName = await productModel
        .findOne({ normalizedName, _id: { $ne: productId } })
        .session(session);
      if (isDuplicateName) {
        throw {
          status: 400,
          msg: "Tên sản phẩm đã tồn tại.",
        };
      }
      updateData.slug = slugify(name, { lower: true, strict: true });
      updateData.normalizedName = normalizedName;
    } else {
      updateData.slug = existingProduct.slug;
      updateData.normalizedName = existingProduct.normalizedName;
    }

    if (thumbProduct) {
      if (existingProduct.thumbFileName) {
        uploadedResources.push(existingProduct.thumbFileName);
        await cloudinary.uploader.destroy(existingProduct.thumbFileName);
      }
      const uploadedThumb = await uploadImageAndTrack(
        thumbProduct.path,
        thumbProduct.mimetype,
        "/products/productThumbs"
      );
      updateData.thumbUrl = uploadedThumb.secure_url;
      updateData.thumbFileName = uploadedThumb.public_id;
    } else {
      updateData.thumbUrl = existingProduct.thumbUrl;
      updateData.thumbFileName = existingProduct.thumbFileName;
    }

    if (Array.isArray(featuredImagesDelete)) {
      await Promise.all(
        featuredImagesDelete.map((filename) =>
          cloudinary.uploader.destroy(filename)
        )
      );
      updateData.featuredImages = existingProduct.featuredImages.filter(
        (img) => !featuredImagesDelete.includes(img.imageFileName)
      );
    } else {
      updateData.featuredImages = existingProduct.featuredImages;
    }

    if (Array.isArray(featuredImages) && featuredImages.length > 0) {
      const uploadedFeatured = await Promise.all(
        featuredImages.map((image) =>
          uploadImageAndTrack(
            image.path,
            image.mimetype,
            "/products/productFeatured"
          )
        )
      );
      const newImages = uploadedFeatured.map((uploaded) => ({
        image: uploaded.secure_url,
        imageFileName: uploaded.public_id,
      }));
      updateData.featuredImages = [
        ...(updateData.featuredImages || []),
        ...newImages,
      ];
    }

    updatedProduct = await productModel
      .findByIdAndUpdate(productId, updateData, { new: true, session })
      .session(session);

    const existingItems = await productItemModel
      .find({ productId })
      .session(session);

    const thumbProductItemMap = {};
    const productItemImagesMap = {};

    if (Array.isArray(thumbProductItem)) {
      thumbProductItem.forEach((file) => {
        const match = file.fieldname.match(/thumbProductItem\[([a-f\d]{24})\]/);
        if (match) {
          thumbProductItemMap[match[1]] = file;
        }
      });
    }

    if (Array.isArray(productItemImages)) {
      productItemImages.forEach((file) => {
        const match = file.fieldname.match(
          /productItemImages\[([a-f\d]{24})\]/
        );
        if (match) {
          const id = match[1];
          productItemImagesMap[id] = productItemImagesMap[id] || [];
          productItemImagesMap[id].push(file);
        }
      });
    }

    if (Array.isArray(productItems) && productItems.length > 0) {
      for (const item of productItems) {
        const isNewItem = !item._id;
        const existingItem = isNewItem
          ? null
          : existingItems.find((pi) => pi._id.toString() === item._id);

        if (!mongoose.isValidObjectId(item.branchId)) {
          throw {
            status: 400,
            msg: "ID chi nhánh không hợp lệ.",
          };
        }

        const branchExists = await branchModel
          .exists({ _id: item.branchId })
          .session(session);
        if (!branchExists) {
          throw {
            status: 400,
            msg: "Không tìm thấy chi nhánh.",
          };
        }

        if (!item.name) {
          throw {
            status: 400,
            msg: "Tên là bắt buộc cho sản phẩm.",
          };
        }

        const itemNormalizedName = normalizeName(item.name);

        let barcodeUpload = null;
        if (
          item.barcode &&
          (!existingItem || item.barcode !== existingItem.barcode)
        ) {
          if (!item.barcode) {
            throw {
              status: 400,
              msg: "Mã vạch là bắt buộc cho sản phẩm.",
            };
          }

          const isExistBarcode = await productItemModel
            .findOne({ barcode: item.barcode, _id: { $ne: item._id } })
            .session(session);
          if (isExistBarcode) {
            throw {
              status: 400,
              msg: `Mã vạch "${item.barcode}" đã tồn tại.`,
            };
          }

          if (existingItem?.barcodeFileName) {
            uploadedResources.push(existingItem.barcodeFileName);
            await cloudinary.uploader.destroy(existingItem.barcodeFileName);
          }

          barcodeUpload = await generateBarcodeImageToCloudinary(item.barcode);
          uploadedResources.push(barcodeUpload.public_id);
        }

        let uploadedThumb = { secure_url: "", public_id: "" };
        const thumbFile = item._id ? thumbProductItemMap[item._id] : null;
        if (thumbFile) {
          if (existingItem?.thumbFileName) {
            uploadedResources.push(existingItem.thumbFileName);
            await cloudinary.uploader.destroy(existingItem.thumbFileName);
          }
          uploadedThumb = await uploadImageAndTrack(
            thumbFile.path,
            thumbFile.mimetype,
            "/products/itemThumbs"
          );
        } else if (existingItem) {
          uploadedThumb.secure_url = existingItem.thumbUrl;
          uploadedThumb.public_id = existingItem.thumbFileName;
        }

        let images = existingItem?.images || [];
        if (Array.isArray(productItemImagesDelete) && images.length > 0) {
          const deleteForThisItem = images.filter((img) =>
            productItemImagesDelete.includes(img.imageFileName)
          );
          if (deleteForThisItem.length > 0) {
            await Promise.all(
              deleteForThisItem.map((img) =>
                cloudinary.uploader.destroy(img.imageFileName)
              )
            );
            images = images.filter(
              (img) => !productItemImagesDelete.includes(img.imageFileName)
            );
          }
        }

        const detailImages = item._id
          ? productItemImagesMap[item._id] || []
          : [];
        if (detailImages.length > 0) {
          const uploadedDetail = await Promise.all(
            detailImages.map((img) =>
              uploadImageAndTrack(
                img.path,
                img.mimetype,
                "/products/itemImages"
              )
            )
          );
          const newImages = uploadedDetail.map((uploaded) => ({
            image: uploaded.secure_url,
            imageFileName: uploaded.public_id,
          }));
          images = [...images, ...newImages];
        }

        if (isNewItem) {
          let sku,
            attempt = 0;
          do {
            if (attempt++ > 5) {
              throw {
                status: 400,
                msg: "Không thể tạo SKU duy nhất.",
              };
            }
            sku = generateSKU();
          } while (await productItemModel.findOne({ sku }).session(session));

          const newItem = {
            productId,
            name: item.name,
            normalizedName: itemNormalizedName,
            sku,
            barcode: item.barcode,
            barcodeImageUrl: barcodeUpload?.secure_url || "",
            barcodeFileName: barcodeUpload?.public_id || "",
            thumbUrl: uploadedThumb.secure_url,
            thumbFileName: uploadedThumb.public_id,
            images,
            attributes: item.attributes || [],
            specifications: item.specifications || [],
            status: item.status,
            retailPrice: item.retailPrice || 0,
            _tempSupplier: item.supplierId,
            _tempBranch: item.branchId,
            _tempInitialStock: item.initialStock || 0,
          };

          const savedItem = await productItemModel.create([newItem], {
            session,
          });
          updatedItems.push(savedItem[0]);

          if (item.initialStock > 0) {
            await inventoryModel.create(
              [
                {
                  productItemId: savedItem[0]._id,
                  quantity: item.initialStock,
                },
              ],
              { session }
            );

            await inventoryTransactionModel.create(
              [
                {
                  productItemId: savedItem[0]._id,
                  type: "import",
                  quantity: item.initialStock,
                  branchId: item.branchId,
                  supplierId: item.supplierId,
                  note: "Nhập kho ban đầu.",
                },
              ],
              { session }
            );
          }
        } else {
          const updatedItem = await productItemModel
            .findByIdAndUpdate(
              item._id,
              {
                name: item.name,
                normalizedName: itemNormalizedName,
                barcode: item.barcode || existingItem.barcode,
                barcodeImageUrl:
                  barcodeUpload?.secure_url || existingItem.barcodeImageUrl,
                barcodeFileName:
                  barcodeUpload?.public_id || existingItem.barcodeFileName,
                thumbUrl: uploadedThumb.secure_url || existingItem.thumbUrl,
                thumbFileName:
                  uploadedThumb.public_id || existingItem.thumbFileName,
                images,
                retailPrice: item.retailPrice || existingItem.retailPrice,
                attributes: item.attributes || existingItem.attributes,
                specifications:
                  item.specifications || existingItem.specifications,
                status: item.status || existingItem.status,
              },
              { new: true, session }
            )
            .session(session);

          updatedItems.push(updatedItem);
        }
      }
    }

    updatedItems = updatedItems.map((item) => {
      const cleanItem = item.toObject();
      delete cleanItem._tempSupplier;
      delete cleanItem._tempBranch;
      delete cleanItem._tempInitialStock;
      return cleanItem;
    });

    await session.commitTransaction();

    return {
      success: true,
      msg: "Sản phẩm được cập nhật thành công.",
      product: updatedProduct,
      productItems: updatedItems,
    };
  } catch (error) {
    await session.abortTransaction();
    console.error("Lỗi trong quá trình cập nhật sản phẩm:", error);
    if (uploadedResources.length > 0) {
      try {
        await Promise.all(
          uploadedResources.map((id) => deleteFromCloudinary(id))
        );
      } catch (cleanupError) {
        console.error("Lỗi khi dọn dẹp tài nguyên đã tải lên:", cleanupError);
      }
    }
    throw throwError(error);
  } finally {
    session.endSession();
    await cleanupTempFiles([
      ...(thumbProduct ? [thumbProduct] : []),
      ...(featuredImages || []),
      ...(thumbProductItem || []),
      ...(productItemImages || []),
    ]);
  }
};

const updateProductVisibilityByIdService = async ({ productId, isActive }) => {
  try {
    isActive = toBoolean(isActive);

    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const updateProductVisibility = await productModel.findByIdAndUpdate(
      productId,
      { $set: { isActive } },
      { new: true }
    );

    if (!updateProductVisibility) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    return {
      success: true,
      msg: `Sản phẩm được ${isActive ? "hiển thị" : "ẩn"} thành công.`,
      product: updateProductVisibility,
    };
  } catch (error) {
    console.error(
      "Lỗi trong quá trình cập nhật trạng thái hiển thị sản phẩm:",
      error
    );

    throw throwError(error);
  }
};

const updateProductItemStatusByIdService = async ({
  productItemId,
  status,
}) => {
  try {
    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm con không hợp lệ.",
      };
    }
    const updatedProductItemStatus = await productItemModel.findByIdAndUpdate(
      productItemId,
      { $set: { status } },
      { new: true }
    );

    if (!updatedProductItemStatus) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm con.",
      };
    }

    return {
      success: true,
      msg: `Trạng thái sản phẩm con được cập nhật thành "${status}" thành công.`,
      productItem: updatedProductItemStatus,
    };
  } catch (error) {
    console.error(
      "Lỗi trong quá trình cập nhật trạng thái sản phẩm con:",
      error
    );

    throw throwError(error);
  }
};

const incrementProductViewsByIdService = async ({ productItemId, userId }) => {
  try {
    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm con không hợp lệ.",
      };
    }

    const updatedProductViews = await productItemModel.findByIdAndUpdate(
      productItemId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!updatedProductViews) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm con.",
      };
    }

    await interactionModel.create({
      userId,
      productItemId,
      interactionType: "view",
    });

    return {
      success: true,
      msg: "Lượt xem sản phẩm được tăng thành công.",
      productItem: updatedProductViews,
    };
  } catch (error) {
    console.error("Lỗi trong quá trình tăng lượt xem sản phẩm con:", error);
    throw throwError(error);
  }
};

const getProductByIdService = async ({ productId }) => {
  try {
    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const result = await productModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(productId),
        },
      },
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$$productId", "$productIds"] },
                validFrom: { $lte: new Date() },
                validTo: { $gte: new Date() },
              },
            },
            {
              $project: { _id: 0, type: 1, value: 1 },
            },
          ],
          as: "discount",
        },
      },
      {
        $unwind: {
          path: "$discount",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          discountType: "$discount.type",
          discountValue: "$discount.value",
        },
      },
      {
        $project: {
          discount: 0,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category.parentId",
          foreignField: "_id",
          as: "parentCategory",
        },
      },
      {
        $unwind: {
          path: "$parentCategory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "category.parent": "$parentCategory",
        },
      },
      {
        $project: {
          parentCategory: 0,
        },
      },
      {
        $lookup: {
          from: "productitems",
          let: {
            productId: "$_id",
            discountType: "$discount.type",
            discountValue: "$discount.value",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$productId", "$$productId"] },
              },
            },
            {
              $addFields: {
                discountedPrice: {
                  $cond: {
                    if: {
                      $and: [
                        { $ifNull: ["$$discountType", false] },
                        { $ifNull: ["$$discountValue", false] },
                      ],
                    },
                    then: {
                      $cond: {
                        if: { $eq: ["$$discountType", "percentage"] },
                        then: {
                          $subtract: [
                            "$retailPrice",
                            {
                              $multiply: [
                                "$retailPrice",
                                { $divide: ["$$discountValue", 100] },
                              ],
                            },
                          ],
                        },
                        else: {
                          $subtract: ["$retailPrice", "$$discountValue"],
                        },
                      },
                    },
                    else: "$retailPrice",
                  },
                },
              },
            },
            {
              $lookup: {
                from: "inventories",
                localField: "_id",
                foreignField: "productItemId",
                as: "inventory",
              },
            },
          ],
          as: "productItems",
        },
      },
    ]);

    if (result.length === 0) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    return {
      success: true,
      msg: "Sản phẩm được lấy thành công.",
      product: result[0],
    };
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm:", error);
    throw throwError(error);
  }
};

const getAllProductsService = async ({ query, user }) => {
  try {
    if (!user || user.role !== "admin") {
      query.isActive = true;
    }

    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);
    if (queries?.name) {
      formattedQueries.name = {
        $regex: escapeRegex(queries.name.trim()),
        $options: "i",
      };
    }

    if (queries?.brandId) {
      formattedQueries.brandId = new mongoose.Types.ObjectId(queries.brandId);
    }

    if (queries?.categoryId) {
      formattedQueries.categoryId = new mongoose.Types.ObjectId(
        queries.categoryId
      );
    }

    if (queries?.isActive) {
      formattedQueries.isActive = toBoolean(queries.isActive);
    }

    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) limit = +process.env.LIMIT || 4;
    if (limit === 0) limit = null;
    const skip = limit ? (page - 1) * limit : 0;

    let sortStage = {};
    if (query.sort) {
      const sortByFields = query.sort.split(",");
      sortByFields.forEach((field) => {
        const isDescending = field.startsWith("-");
        const key = isDescending ? field.slice(1) : field;
        sortStage[key] = isDescending ? -1 : 1;
      });
    }

    let projectStage = null;
    if (query.fields) {
      const fields = query.fields.split(",");
      projectStage = {};
      fields.forEach((f) => (projectStage[f] = 1));
    }

    const pipeline = [
      { $match: formattedQueries },
      {
        $lookup: {
          from: "brands",
          localField: "brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$productIds"] },
                    { $lte: ["$validFrom", new Date()] },
                    { $gte: ["$validTo", new Date()] },
                  ],
                },
              },
            },
            { $sort: { validFrom: -1 } },
            { $limit: 1 },
          ],
          as: "discount",
        },
      },
      { $unwind: { path: "$discount", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          discountType: "$discount.type",
          discountValue: "$discount.value",
        },
      },
      { $project: { discount: 0 } },
      {
        $lookup: {
          from: "productitems",
          let: {
            productId: "$_id",
            discountType: "$discountType",
            discountValue: "$discountValue",
          },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$productId", "$$productId"] } },
            },
            {
              $addFields: {
                discountedPrice: {
                  $cond: {
                    if: {
                      $and: [
                        { $ifNull: ["$$discountType", false] },
                        { $ifNull: ["$$discountValue", false] },
                      ],
                    },
                    then: {
                      $cond: {
                        if: { $eq: ["$$discountType", "percentage"] },
                        then: {
                          $subtract: [
                            "$retailPrice",
                            {
                              $multiply: [
                                "$retailPrice",
                                { $divide: ["$$discountValue", 100] },
                              ],
                            },
                          ],
                        },
                        else: {
                          $subtract: ["$retailPrice", "$$discountValue"],
                        },
                      },
                    },
                    else: "$retailPrice",
                  },
                },
              },
            },
            {
              $lookup: {
                from: "inventories",
                localField: "_id",
                foreignField: "productItemId",
                as: "inventory",
              },
            },
          ],
          as: "productItems",
        },
      },
      ...(Object.keys(sortStage).length ? [{ $sort: sortStage }] : []),

      ...(projectStage
        ? [{ $project: { ...projectStage, productItems: 1 } }]
        : []),

      ...(limit !== null ? [{ $skip: skip }, { $limit: limit }] : []),
    ];

    const [products, total, activeProducts, inactiveProducts] =
      await Promise.all([
        productModel.aggregate(pipeline),
        productModel.countDocuments(formattedQueries),
        productModel.countDocuments({ ...formattedQueries, isActive: true }),
        productModel.countDocuments({ ...formattedQueries, isActive: false }),
      ]);

    return {
      success: true,
      msg: "Danh sách sản phẩm được lấy thành công.",
      totalProducts: total,
      activeProducts,
      inactiveProducts,
      productList: products,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    throw throwError(error);
  }
};

const getAllProductItemsService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(/\b(gte|gt|lt|lte)\b/g, (m) => `$${m}`);
    let formattedQueries = JSON.parse(queryString);

    if (queries?.name) {
      formattedQueries.name = { $regex: queries.name, $options: "i" };
    }

    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) limit = +process.env.LIMIT || 4;
    if (limit === 0) limit = null;
    const skip = limit ? (page - 1) * limit : 0;

    let sortStage = {};
    if (query.sort) {
      const sortByFields = query.sort.split(",");
      sortByFields.forEach((field) => {
        const isDescending = field.startsWith("-");
        const key = isDescending ? field.slice(1) : field;
        sortStage[key] = isDescending ? -1 : 1;
      });
    }

    let projectStage = null;
    if (query.fields) {
      const fields = query.fields.split(",");
      projectStage = {};
      fields.forEach((f) => (projectStage[f] = 1));
    }

    const pipeline = [
      { $match: formattedQueries },

      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "product.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$productId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$productIds"] },
                    { $lte: ["$validFrom", new Date()] },
                    { $gte: ["$validTo", new Date()] },
                  ],
                },
              },
            },
            { $sort: { validFrom: -1 } },
            { $limit: 1 },
          ],
          as: "discount",
        },
      },
      { $unwind: { path: "$discount", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          discountType: "$discount.type",
          discountValue: "$discount.value",
          discountedPrice: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ["$discount.type", false] },
                  { $ifNull: ["$discount.value", false] },
                ],
              },
              then: {
                $cond: {
                  if: { $eq: ["$discount.type", "percentage"] },
                  then: {
                    $subtract: [
                      "$retailPrice",
                      {
                        $multiply: [
                          "$retailPrice",
                          { $divide: ["$discount.value", 100] },
                        ],
                      },
                    ],
                  },
                  else: { $subtract: ["$retailPrice", "$discount.value"] },
                },
              },
              else: "$retailPrice",
            },
          },
        },
      },
      { $project: { discount: 0 } },
      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "productItemId",
          as: "inventory",
        },
      },

      ...(Object.keys(sortStage).length ? [{ $sort: sortStage }] : []),

      ...(projectStage
        ? [
            {
              $project: {
                ...projectStage,
                product: 1,
                brand: 1,
                category: 1,
                inventory: 1,
                discountedPrice: 1,
              },
            },
          ]
        : []),

      ...(limit !== null ? [{ $skip: skip }, { $limit: limit }] : []),
    ];

    const [productItems, total] = await Promise.all([
      productItemModel.aggregate(pipeline),
      productItemModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Danh sách sản phẩm con được lấy thành công.",
      totalProductItems: total,
      productItemList: productItems,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm con:", error);
    throw throwError(error);
  }
};

const getPopularProductItemsService = async (query = {}) => {
  try {
    const { limit = 10, status } = query;

    const matchStage = {
      $or: [
        { soldCount: { $gt: 0 } },
        { viewCount: { $gt: 0 } },
        { ratingAvg: { $gt: 0 } },
      ],
    };

    if (status) {
      matchStage.status = status;
    }

    const pipeline = [
      { $match: matchStage },

      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "brands",
          localField: "product.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: "discounts",
          let: { productId: "$productId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$productIds"] },
                    { $lte: ["$validFrom", new Date()] },
                    { $gte: ["$validTo", new Date()] },
                  ],
                },
              },
            },
            { $sort: { validFrom: -1 } },
            { $limit: 1 },
          ],
          as: "discount",
        },
      },
      { $unwind: { path: "$discount", preserveNullAndEmptyArrays: true } },

      {
        $addFields: {
          discountedPrice: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ["$discount.type", false] },
                  { $ifNull: ["$discount.value", false] },
                ],
              },
              then: {
                $cond: {
                  if: { $eq: ["$discount.type", "percentage"] },
                  then: {
                    $subtract: [
                      "$retailPrice",
                      {
                        $multiply: [
                          "$retailPrice",
                          { $divide: ["$discount.value", 100] },
                        ],
                      },
                    ],
                  },
                  else: { $subtract: ["$retailPrice", "$discount.value"] },
                },
              },
              else: "$retailPrice",
            },
          },
        },
      },

      {
        $lookup: {
          from: "inventories",
          localField: "_id",
          foreignField: "productItemId",
          as: "inventory",
        },
      },

      { $sort: { soldCount: -1, viewCount: -1, ratingAvg: -1 } },

      { $limit: Number(limit) },
    ];

    const popularProducts = await productItemModel.aggregate(pipeline);

    return {
      success: true,
      msg: "Danh sách sản phẩm phổ biến được lấy thành công.",
      totalProductItems: popularProducts.length,
      productItemList: popularProducts,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm phổ biến:", error);
    throw throwError(error);
  }
};

const getRelatedProductItemsService = async ({ productItemId, limit = 5 }) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "product.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "discounts",
          let: { productId: "$productId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ["$$productId", "$productIds"] },
                    { $lte: ["$validFrom", new Date()] },
                    { $gte: ["$validTo", new Date()] },
                  ],
                },
              },
            },
            { $sort: { validFrom: -1 } },
            { $limit: 1 },
          ],
          as: "discount",
        },
      },
      { $unwind: { path: "$discount", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          discountedPrice: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ["$discount.type", false] },
                  { $ifNull: ["$discount.value", false] },
                ],
              },
              then: {
                $cond: {
                  if: { $eq: ["$discount.type", "percentage"] },
                  then: {
                    $subtract: [
                      "$retailPrice",
                      {
                        $multiply: [
                          "$retailPrice",
                          { $divide: ["$discount.value", 100] },
                        ],
                      },
                    ],
                  },
                  else: { $subtract: ["$retailPrice", "$discount.value"] },
                },
              },
              else: "$retailPrice",
            },
          },
          // Tạo trường features cho TF-IDF
          features: {
            $concat: [
              { $ifNull: ["$product.name", ""] },
              " ",
              { $ifNull: ["$category.name", ""] },
              " ",
              { $ifNull: ["$brand.name", ""] },
              " ",
              { $ifNull: ["$product.description", ""] },
            ],
          },
        },
      },
      {
        $match: {
          status: "active", // Chỉ lấy sản phẩm đang hoạt động
        },
      },
    ];

    const products = await productItemModel.aggregate(pipeline);

    // Tạo TF-IDF vectorizer
    const tfidf = new TfIdf();
    products.forEach((product) => {
      tfidf.addDocument(product.features || "");
    });

    // Tìm sản phẩm vừa xem
    const targetProduct = products.find(
      (p) => p._id.toString() === productItemId
    );
    if (!targetProduct) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Tính độ tương đồng
    const similarities = [];
    products.forEach((product, index) => {
      if (product._id.toString() !== productItemId) {
        const targetVector = tfidf.tfidfs(targetProduct.features || "");
        const otherVector = tfidf.tfidfs(product.features || "");
        let similarity = 0;
        if (targetVector.length === otherVector.length) {
          const dotProduct = targetVector.reduce(
            (sum, val, i) => sum + val * otherVector[i],
            0
          );
          const normTarget = Math.sqrt(
            targetVector.reduce((sum, val) => sum + val * val, 0)
          );
          const normOther = Math.sqrt(
            otherVector.reduce((sum, val) => sum + val * val, 0)
          );
          similarity =
            normTarget && normOther ? dotProduct / (normTarget * normOther) : 0;
        }
        similarities.push({ index, similarity });
      }
    });

    // Sắp xếp và lấy top K sản phẩm
    similarities.sort((a, b) => b.similarity - a.similarity);
    const recommendedIndices = similarities
      .slice(0, Number(limit))
      .map((s) => s.index);
    const recommendedProducts = recommendedIndices.map((i) => products[i]);

    return {
      success: true,
      msg: "Danh sách sản phẩm liên quan được lấy thành công.",
      totalProductItems: recommendedProducts.length,
      productItemList: recommendedProducts,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm liên quan:", error);
    throw error;
  }
};

const deleteProductByIdService = async ({ productId }) => {
  const session = await mongoose.startSession();

  try {
    if (!mongoose.isValidObjectId(productId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm không hợp lệ.",
      };
    }

    const product = await productModel.findById(productId).session(session);
    if (!product) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm.",
      };
    }

    const publicIdsToDelete = [
      product.thumbFileName,
      ...product.featuredImages.map((img) => img.imageFileName),
    ];

    const productItems = await productItemModel
      .find({ productId })
      .session(session);
    const itemIds = productItems.map((item) => item._id);

    for (const item of productItems) {
      publicIdsToDelete.push(item.thumbFileName, item.barcodeFileName);
      item.images.forEach((img) => publicIdsToDelete.push(img.imageFileName));
    }

    await session.withTransaction(async () => {
      await inventoryModel.deleteMany(
        { productItemId: { $in: itemIds } },
        { session }
      );
      await inventoryTransactionModel.deleteMany(
        { productItemId: { $in: itemIds } },
        { session }
      );
      await productItemModel.deleteMany({ _id: { $in: itemIds } }, { session });

      await productModel.deleteOne({ _id: productId }, { session });
    });

    await Promise.allSettled(
      publicIdsToDelete.map((id) => deleteFromCloudinary(id))
    );

    return {
      success: true,
      msg: "Sản phẩm được xóa thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    throw throwError(error);
  } finally {
    await session.endSession();
  }
};

const deleteProductItemByIdService = async ({ productItemId }) => {
  const session = await mongoose.startSession();

  try {
    if (!mongoose.isValidObjectId(productItemId)) {
      throw {
        status: 400,
        msg: "ID sản phẩm con không hợp lệ.",
      };
    }

    const deletedProductItem = await productItemModel
      .findById(productItemId)
      .session(session);

    if (!deletedProductItem) {
      throw {
        status: 404,
        msg: "Không tìm thấy sản phẩm con.",
      };
    }

    const publicIdsToDelete = [];

    if (deletedProductItem.thumbFileName) {
      publicIdsToDelete.push(deletedProductItem.thumbFileName);
    }

    if (deletedProductItem.barcodeFileName) {
      publicIdsToDelete.push(deletedProductItem.barcodeFileName);
    }

    if (Array.isArray(deletedProductItem.images)) {
      deletedProductItem.images.forEach((img) => {
        if (img.imageFileName) {
          publicIdsToDelete.push(img.imageFileName);
        }
      });
    }

    await session.withTransaction(async () => {
      await inventoryModel.deleteMany({ productItemId }, { session });

      await inventoryTransactionModel.deleteMany(
        { productItemId },
        { session }
      );

      await productItemModel.deleteOne({ _id: productItemId }, { session });
    });

    await Promise.allSettled(
      publicIdsToDelete.map((id) => cloudinary.uploader.destroy(id))
    );

    return {
      success: true,
      msg: "Sản phẩm con được xóa thành công.",
      data: deletedProductItem,
    };
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm con:", error);
    throw throwError(error);
  } finally {
    await session.endSession();
  }
};

//-----------------------------------------------------------------------

const mapping = {
  B00BT8L2MW: "68ec5c9962632ee0996aba41",
  B00S19FUWA: "68ec5db362632ee0996aba9e",
  B00PA9RFTU: "68ec6057adf35fb5c747c4b4",
  B00HLA7VYA: "68ecaa8c2dfd05288e2adb1b",
  B07CPTZV8C: "68ecae352dfd05288e2adcfa",
  B07RL2N8YY: "68ecb0992dfd05288e2addfb",
  B07BNT3NM4: "68ecb3eb2dfd05288e2adebf",
  B07C8CRHLH: "68ecb5b92dfd05288e2adfc5",
  B08GSK59Y5: "68ecb6922dfd05288e2ae04d",
  B07L4HZVC7: "68ecb87a2dfd05288e2ae0f4",
  B00M798YZU: "68ecbc1d2dfd05288e2ae217",
  B08X4M2NVC: "68ecbf7a2dfd05288e2ae31d",
  B0BXP115DF: "68ecc449ee8d3141c86c5926",
  B07FK64GRS: "68ecc6d6ee8d3141c86c5b71",
  B092Z1KM1G: "68ecc87bee8d3141c86c6003",
  B01CU1EC6Y: "68ecc9efee8d3141c86c606f",
  B01LW1U5XX: "68ecca80ee8d3141c86c60bc",
  B00JQMDGG8: "68eccb9dee8d3141c86c617d",
  B08JYTRK9G: "68eccc6cee8d3141c86c620f",
  B0BS537K9L: "68eccedeee8d3141c86c62ad",
  B06XQV5DDP: "68eccf61ee8d3141c86c62eb",
  B08K45HPH3: "68ecd116ee8d3141c86c637d",
  B08VHJH6Q2: "68ecd210ee8d3141c86c63ca",
  B07GT9VYKF: "68ecd363ee8d3141c86c643e",
  B00NP5GQWI: "68ecd43dee8d3141c86c647c",
  B0C4T6NPBG: "68ecd53dee8d3141c86c6521",
  B01JIYWUBA: "68edc5f53541d29f0849dc58",
  B07J2DCPMK: "68edc8c5d3b82de7332a72ab",
  B07SZHKGZJ: "68edced7e6a27d2f0dce98e5",
  B00YRYS4T4: "68ee13125333b38c24618c56",
};

const reverseMapping = Object.fromEntries(
  Object.entries(mapping).map(([key, value]) => [value, key])
);

const getRecommendationsForUserService = async ({ userId }, topN = 10) => {
  try {
    let user_id = userId;
    console.log("User ID:", user_id);
    if (userId === "68b59b42b615281f13b5eec8") {
      user_id = "AG73BVBKUOH22USSFJA5ZWL7AKXA";
    } else if (userId === "68f462e3ce56e859b23d86a9") {
      user_id = "AHOEIYJJHZ7ITX75BOFQYNXVVJQQ";
    } else {
      return {
        success: true,
        msg: "Không tìm thấy sản phẩm hợp lệ để gợi ý.",
        recommendedProductList: [],
      };
    }

    const response = await axios.post(
      `${process.env.PYTHON_API}/recommend`,
      { user_id, top_k: topN },
      { headers: { "Content-Type": "application/json" } }
    );

    const recommendations = response?.data || [];

    console.log("Recommendations:", recommendations);

    const asinList = recommendations
      .map((item) => mapping[item.item_id] || null)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (asinList.length === 0) {
      return {
        success: true,
        msg: "Không tìm thấy sản phẩm hợp lệ để gợi ý.",
        recommendedProductList: [],
      };
    }

    const recommendedProductList = await productItemModel.find({
      _id: { $in: asinList.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    return {
      success: true,
      msg: "Đề xuất sản phẩm cho user thành công.",
      recommendedProductList,
    };
  } catch (error) {
    console.error("Lỗi khi lấy đề xuất sản phẩm:", error);
    throw new Error("Không thể lấy danh sách gợi ý sản phẩm.");
  }
};

const getSimilarItemsService = async ({ productId }, topN = 10) => {
  try {
    const externalIdToQuery = reverseMapping[productId];

    if (!externalIdToQuery) {
      console.warn(
        `Không tìm thấy ID bên ngoài tương ứng với productId: ${productId}`
      );
      return {
        success: true,
        msg: "Không tìm thấy sản phẩm hợp lệ để gợi ý.",
        recommendedProductList: [],
      };
    }

    const response = await axios.post(
      `${process.env.PYTHON_API}/similar-items`,
      { item_id: externalIdToQuery, top_k: topN },
      { headers: { "Content-Type": "application/json" } }
    );

    const recommendations = response?.data || [];

    console.log("Recommendations:", recommendations);

    const asinList = recommendations
      .map((item) => mapping[item.item_id] || null)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    if (asinList.length === 0) {
      return {
        success: true,
        msg: "Không tìm thấy sản phẩm hợp lệ để gợi ý.",
        recommendedProductList: [],
      };
    }

    const recommendedProductList = await productItemModel.find({
      _id: { $in: asinList.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    return {
      success: true,
      msg: "Đề xuất sản phẩm cho user thành công.",
      recommendedProductList,
    };
  } catch (error) {
    console.error("Lỗi khi lấy đề xuất sản phẩm:", error);
    throw new Error("Không thể lấy danh sách gợi ý sản phẩm.");
  }
};

module.exports = {
  createProductService,
  createProductItemService,
  updateProductByIdService,
  updateProductItemStatusByIdService,
  updateProductVisibilityByIdService,
  getAllProductsService,
  getProductByIdService,
  getAllProductItemsService,
  incrementProductViewsByIdService,
  deleteProductByIdService,
  deleteProductItemByIdService,
  getPopularProductItemsService,
  getRecommendationsForUserService,
  getSimilarItemsService,
  getRelatedProductItemsService,
};
