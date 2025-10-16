const OtpGenerator = require("otp-generator");
const { customAlphabet } = require("nanoid");
const bwipjs = require("bwip-js");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const generateOTP = (length = 6) => {
  try {
    if (!OtpGenerator) throw new Error("Module OtpGenerator không khả dụng");
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error("Độ dài phải là một số nguyên dương");
    }
    return OtpGenerator.generate(length, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  } catch (error) {
    throw new Error("Không thể tạo mã OTP");
  }
};

const generateSKU = (length = 8) => {
  try {
    if (!customAlphabet) throw new Error("Module nanoid không khả dụng");
    if (!Number.isInteger(length) || length <= 0) {
      throw new Error("Độ dài phải là một số nguyên dương");
    }
    const nanoidNumbers = customAlphabet("0123456789", length);
    return nanoidNumbers();
  } catch (error) {
    throw new Error("Không thể tạo SKU");
  }
};

const uploadFromBuffer = (buffer, barcodeString) => {
  return new Promise((resolve, reject) => {
    const safeId = encodeURIComponent(barcodeString);
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "TechZone/products/barcodes",
        public_id: `barcode_${safeId}`,
        resource_type: "image",
        format: "png",
        overwrite: true,
        tags: ["barcode"],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const generateBarcodeImageToCloudinary = async (barcodeString) => {
  try {
    if (
      !barcodeString ||
      typeof barcodeString !== "string" ||
      barcodeString.trim() === ""
    ) {
      throw new Error("Chuỗi mã vạch không hợp lệ hoặc rỗng");
    }
    if (!cloudinary.config().cloud_name) {
      throw new Error("Cấu hình Cloudinary bị thiếu");
    }

    const pngBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: barcodeString,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    const uploadResult = await uploadFromBuffer(pngBuffer, barcodeString);

    return {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
  } catch (error) {
    throw new Error("Không thể tạo hoặc tải ảnh mã vạch lên Cloudinary");
  }
};

const generateCode = ({ prefix }) => {
  try {
    if (!prefix || typeof prefix !== "string" || prefix.trim() === "") {
      throw new Error("Tiền tố không hợp lệ hoặc rỗng");
    }
    const now = new Date();
    const datePart = `${String(now.getFullYear()).slice(-2)}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);
    const randomPart = nanoid();

    return `${datePart}${prefix}${randomPart}`;
  } catch (error) {
    throw new Error("Không thể tạo mã");
  }
};

const removeVietnameseTones = (str, separator = "-") => {
  try {
    if (typeof str !== "string" || str.trim() === "") {
      throw new Error("Input phải là chuỗi không rỗng");
    }
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, separator)
      .replace(new RegExp(`${separator}+`, "g"), separator)
      .toLowerCase()
      .trim();
  } catch (error) {
    throw new Error("Không thể xử lý chuỗi");
  }
};

const normalizeName = (str) => {
  try {
    if (typeof str !== "string" || str.trim() === "") {
      throw new Error("Input phải là chuỗi không rỗng");
    }
    return removeVietnameseTones(str, " ").replace(/-+/g, " ");
  } catch (error) {
    throw new Error("Không thể chuẩn hóa tên");
  }
};

const toBoolean = (value) => {
  if (value === undefined || value === null) return false;
  const truthyValues = ["true", "1", "yes", "on"];
  return truthyValues.includes(value.toString().toLowerCase());
};

const isValidGeoPoint = (location) => {
  try {
    if (
      !location ||
      location.type !== "Point" ||
      !Array.isArray(location.coordinates)
    ) {
      return false;
    }
    const [lng, lat] = location.coordinates;
    return (
      typeof lng === "number" &&
      typeof lat === "number" &&
      !isNaN(lng) &&
      !isNaN(lat) &&
      lng >= -180 &&
      lng <= 180 &&
      lat >= -90 &&
      lat <= 90
    );
  } catch (error) {
    return false;
  }
};

const buildFullAddress = (
  { addressLine, ward, district, province, postalCode },
  separator = ", "
) => {
  try {
    if (!arguments[0] || typeof arguments[0] !== "object") {
      throw new Error("Input phải là một object");
    }
    return [addressLine, ward, district, province, postalCode]
      .filter(Boolean)
      .join(separator);
  } catch (error) {
    throw new Error("Không thể xây dựng địa chỉ");
  }
};

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

module.exports = {
  generateOTP,
  generateSKU,
  generateBarcodeImageToCloudinary,
  generateCode,
  removeVietnameseTones,
  toBoolean,
  normalizeName,
  isValidGeoPoint,
  buildFullAddress,
  escapeRegex,
};
