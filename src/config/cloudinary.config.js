const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const uploadToCloudinary = async (filePath, mimetype, folder = "uploads") => {
  const ext = path.extname(filePath).toLowerCase();
  const mime = mimetype.toLowerCase();

  if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(mime)) {
    throw {
      status: 400,
      msg: "Loại tệp hình ảnh không hợp lệ",
    };
  }

  try {
    const absolutePath = path.resolve(filePath);
    const result = await cloudinary.uploader.upload(absolutePath, {
      folder: `TechZone/${folder}`,
      resource_type: "image",
    });
    return result;
  } catch (err) {
    if (err?.http_code) {
      throw {
        status: err.http_code,
        msg: "Lỗi Cloudinary",
        detail: err.message || err.error?.message || err,
      };
    }

    throw {
      status: err.status || 500,
      msg: err.msg || "Lỗi khi tải lên hình ảnh lên Cloudinary",
      detail: err?.message || err,
    };
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      status: 502,
      msg: "Lỗi khi xóa hình ảnh từ Cloudinary",
      detail: error.message,
    };
  }
};

const cleanupTempFiles = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const deletePromises = files
    .filter((file) => file && file.path)
    .map(async (file) => {
      try {
        const absolutePath = path.resolve(file.path);
        await fs.access(absolutePath, fs.constants.F_OK);
        await fs.unlink(absolutePath);
      } catch (err) {
        if (err.code === "ENOENT") {
          return;
        } else {
          return;
        }
      }
    });

  await Promise.all(deletePromises);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, cleanupTempFiles };
