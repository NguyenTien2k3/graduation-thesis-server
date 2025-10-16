const fs = require("fs");
const util = require("util");
const unlinkAsync = util.promisify(fs.unlink);

const deleteTempFiles = async (files = []) => {
  try {
    if (!Array.isArray(files)) {
      throw new Error("Input phải là một mảng");
    }
    if (files.length === 0) {
      return { success: [], failed: [] };
    }
    if (
      !files.every(
        (file) => file && typeof file.path === "string" && file.path.trim()
      )
    ) {
      throw new Error("Tất cả các tệp phải có đường dẫn hợp lệ và không rỗng");
    }

    const deleteResults = await Promise.allSettled(
      files.map((file) => unlinkAsync(file.path))
    );

    const success = [];
    const failed = [];

    deleteResults.forEach((result, index) => {
      const filePath = files[index].path;
      if (result.status === "fulfilled") {
        success.push(filePath);
      } else {
        failed.push({ path: filePath, error: result.reason.message });
      }
    });

    return { success, failed };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  deleteTempFiles,
};
