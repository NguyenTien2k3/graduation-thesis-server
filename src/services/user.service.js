const cloudinary = require("cloudinary").v2;
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const sendMail = require("../utils/sendMail.util");
const { generateOTP, toBoolean, escapeRegex } = require("../utils/common.util");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middlewares/jwt.middleware");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
  cleanupTempFiles,
} = require("../config/cloudinary.config");
const { throwError } = require("../utils/handleError.util");
const redis = require("../config/redis.config");

const loginService = async ({ email, password }) => {
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    const isPasswordValid = await user.isCorrectPassword(password);
    if (!isPasswordValid) {
      throw {
        status: 401,
        msg: "Mật khẩu không chính xác.",
      };
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    const safeUser = await userModel.findById(user._id).lean();

    return {
      success: true,
      msg: "Đăng nhập thành công.",
      accessToken,
      refreshToken,
      user: safeUser,
    };
  } catch (error) {
    console.error("Lỗi khi người dùng đăng nhập:", error);
    throw throwError(error);
  }
};

const registerService = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  gender,
  dateOfBirth,
}) => {
  try {
    const exists = await userModel.findOne({ email });
    if (exists) {
      if (!exists.isVerified) {
        await exists.deleteOne();
      } else {
        throw {
          status: 409,
          msg: "Email đã tồn tại.",
        };
      }
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    const emailToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`verify_email:${emailToken}`, email, { ex: 60 * 5 });

    await userModel.create({
      firstName,
      lastName,
      fullName,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
      verifyOtpToken: hashedOtp,
      verifyOtpExpiry: otpExpiry,
      isVerified: false,
    });

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;
    await sendMail({
      email,
      html,
      subject: "Xác minh đăng ký OTP",
    });

    return {
      success: true,
      msg: "Tài khoản đã được tạo. Vui lòng kiểm tra email để nhận OTP.",
      emailToken,
    };
  } catch (error) {
    console.error("Lỗi khi người dùng đăng ký:", error);
    throw throwError(error);
  }
};

const resendRegisterOtpService = async ({ emailToken }) => {
  try {
    const email = await redis.get(`verify_email:${emailToken}`);
    if (!email) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (user.isVerified) {
      throw {
        status: 409,
        msg: "Tài khoản đã được xác thực.",
      };
    }

    if (user.verifyOtpExpiry && user.verifyOtpExpiry > Date.now()) {
      const waitTime = Math.ceil((user.verifyOtpExpiry - Date.now()) / 1000);
      throw {
        status: 429,
        msg: `Vui lòng đợi ${waitTime} giây trước khi yêu cầu OTP mới.`,
      };
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.verifyOtpToken = hashedOtp;
    user.verifyOtpExpiry = otpExpiry;
    await user.save();

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;

    await sendMail({
      email,
      html,
      subject: "Xác minh đăng ký OTP",
    });

    return {
      success: true,
      msg: "OTP đã được gửi lại thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi gửi lại OTP:", error);
    throw throwError(error);
  }
};

const verifyRegisterOtpService = async ({ emailToken, otp }) => {
  try {
    const email = await redis.get(`verify_email:${emailToken}`);
    if (!email) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (user.isVerified) {
      throw {
        status: 409,
        msg: "Tài khoản đã được xác thực.",
      };
    }

    if (Date.now() > user.verifyOtpExpiry) {
      throw {
        status: 410,
        msg: "OTP đã hết hạn.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    const isMatch = await bcrypt.compare(otp, user.verifyOtpToken);
    if (!isMatch) {
      throw {
        status: 401,
        msg: "Mã OTP không chính xác.",
      };
    }

    user.isVerified = true;
    user.verifyOtpToken = null;
    user.verifyOtpExpiry = null;
    await user.save();

    await redis.del(`verify_email:${emailToken}`);

    return {
      success: true,
      msg: "Xác minh OTP thành công! Tài khoản đã được kích hoạt",
    };
  } catch (error) {
    console.error("Lỗi khi xác minh OTP:", error);
    throw throwError(error);
  }
};

const sendResetPasswordEmailService = async ({ email }) => {
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    if (user.role === "admin") {
      throw {
        status: 403,
        msg: "Tài khoản admin không được phép reset mật khẩu thông qua OTP.",
      };
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    const emailToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`verify_email:${emailToken}`, email, { ex: 60 * 5 });

    user.verifyOtpToken = hashedOtp;
    user.verifyOtpExpiry = otpExpiry;
    await user.save();

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;
    await sendMail({
      email,
      html,
      subject: "Xác minh reset mật khẩu OTP",
    });

    return {
      success: true,
      msg: "OTP đã được gửi thành công. Vui lòng kiểm tra email.",
      emailToken,
    };
  } catch (error) {
    console.error("Lỗi khi gửi lại OTP:", error);
    throw throwError(error);
  }
};

const resendResetPasswordOtpService = async ({ email }) => {
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    if (user.role === "admin") {
      throw {
        status: 403,
        msg: "Tài khoản admin không được phép reset mật khẩu thông qua OTP.",
      };
    }

    if (user.verifyOtpExpiry && user.verifyOtpExpiry > Date.now()) {
      const waitTime = Math.ceil((user.verifyOtpExpiry - Date.now()) / 1000);
      throw {
        status: 429,
        msg: `Vui lòng đợi ${waitTime} giây trước khi yêu cầu OTP mới.`,
      };
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.verifyOtpToken = hashedOtp;
    user.verifyOtpExpiry = otpExpiry;
    await user.save();

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;

    await sendMail({
      email,
      html,
      subject: "Xác minh reset mật khẩu OTP",
    });

    return {
      success: true,
      msg: "OTP đã được gửi lại thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi gửi lại OTP:", error);
    throw throwError(error);
  }
};

const verifyResetPasswordOtpService = async ({ email, otp }) => {
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    if (Date.now() > user.verifyOtpExpiry) {
      throw {
        status: 400,
        msg: "OTP đã hết hạn.",
      };
    }

    const isMatch = await bcrypt.compare(otp, user.verifyOtpToken);
    if (!isMatch) {
      throw {
        status: 400,
        msg: "Mã OTP không chính xác.",
      };
    }

    user.verifyOtpToken = null;
    user.verifyOtpExpiry = null;
    await user.save();

    return {
      success: true,
      msg: "OTP xác minh thành công! Bạn có thể reset mật khẩu.",
    };
  } catch (error) {
    console.error("Lỗi khi xác minh OTP:", error);
    throw throwError(error);
  }
};

const resetPasswordService = async ({ email, password }) => {
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw {
        status: 404,
        msg: "Email không tồn tại.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    const isPasswordValid = await user.isCorrectPassword(password);
    if (isPasswordValid) {
      throw {
        status: 400,
        msg: "Mật khẩu mới phải khác mật khẩu cũ.",
      };
    }

    user.password = password;
    user.passwordChangedAt = new Date();
    await user.save();

    return {
      success: true,
      msg: "Mật khẩu đã được reset thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi reset mật khẩu:", error);
    throw throwError(error);
  }
};

const getUserCurrentService = async ({ userId }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel
      .findById(userId)
      .lean()
      .select(
        "-refreshToken -password -role -verifyOtpToken -verifyOtpExpiry -passwordChangedAt"
      );
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    return {
      success: true,
      msg: "Người dùng đã tải thành công.",
      userInfo: user,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng: ", error);
    throw throwError(error);
  }
};

const getAllUsersService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    if (queries?.fullName) {
      formattedQueries.fullName = {
        $regex: escapeRegex(queries.fullName.trim()),
        $options: "i",
      };
    }

    if (queries?.isBlocked) {
      formattedQueries.isBlocked = toBoolean(queries.isBlocked);
    }

    formattedQueries.role = "user";

    let queryCommand = userModel
      .find(formattedQueries)
      .select(
        "-refreshToken -password -role -verifyOtpToken -verifyOtpExpiry -passwordChangedAt"
      )
      .lean();

    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    } else {
      queryCommand = queryCommand.sort("-createdAt");
    }
    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) {
      limit = +process.env.LIMIT || 4;
    }
    if (limit === 0) {
      limit = null;
    }
    const skip = limit ? (page - 1) * limit : 0;
    queryCommand = queryCommand.skip(skip);
    if (limit !== null) {
      queryCommand = queryCommand.limit(limit);
    }

    const [users, totalUsers, activeUsers, inactiveUsers] = await Promise.all([
      queryCommand.exec(),
      userModel.countDocuments(formattedQueries),
      userModel.countDocuments({ ...formattedQueries, isBlocked: false }),
      userModel.countDocuments({ ...formattedQueries, isBlocked: true }),
    ]);

    return {
      success: true,
      msg: "Lấy danh sách người dùng thành công.",
      totalUsers,
      activeUsers,
      inactiveUsers,
      userList: users,
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    throw throwError(error);
  }
};

const getAllManagersService = async ({ query }) => {
  try {
    const queries = { ...query };
    const excludeFields = ["limit", "sort", "page", "fields"];
    excludeFields.forEach((el) => delete queries[el]);

    let queryString = JSON.stringify(queries);
    queryString = queryString.replace(
      /\b(gte|gt|lt|lte)\b/g,
      (matchedEl) => `$${matchedEl}`
    );
    let formattedQueries = JSON.parse(queryString);

    if (queries?.firstName) {
      formattedQueries.firstName = { $regex: queries.firstName, $options: "i" };
    }

    if (queries?.lastName) {
      formattedQueries.lastName = { $regex: queries.lastName, $options: "i" };
    }

    formattedQueries.role = { $nin: ["admin", "user"] };

    let queryCommand = userModel
      .find(formattedQueries)
      .select(
        "-refreshToken -password -role -verifyOtpToken -verifyOtpExpiry -passwordChangedAt"
      );

    if (query.sort) {
      const sortBy = query.sort.split(",").join(" ");
      queryCommand = queryCommand.sort(sortBy);
    }

    if (query.fields) {
      const fields = query.fields.split(",").join(" ");
      queryCommand = queryCommand.select(fields);
    }

    const page = Math.max(1, +query.page || 1);
    let limit = Number.isNaN(+query.limit)
      ? +process.env.LIMIT || 4
      : +query.limit;
    if (limit < 0) {
      limit = +process.env.LIMIT || 4;
    }
    if (limit === 0) {
      limit = null;
    }
    const skip = limit ? (page - 1) * limit : 0;
    queryCommand = queryCommand.skip(skip);
    if (limit !== null) {
      queryCommand = queryCommand.limit(limit);
    }

    const [managers, counts] = await Promise.all([
      queryCommand.exec(),
      userModel.countDocuments(formattedQueries),
    ]);

    return {
      success: true,
      msg: "Quản lý đã được truy xuất thành công.",
      totalManagers: counts,
      managerList: managers,
    };
  } catch (error) {
    console.error("Lỗi khi truy xuất managers:", error);
    throw throwError(error);
  }
};

const getManagerByIdService = async ({ managerId }) => {
  try {
    if (!mongoose.isValidObjectId(managerId)) {
      throw {
        status: 400,
        msg: "ID quản lý không hợp lệ.",
      };
    }

    const manager = await userModel
      .findById(managerId)
      .lean()
      .select(
        "-refreshToken -password -verifyOtpToken -verifyOtpExpiry -passwordChangedAt"
      );

    if (!manager) {
      throw {
        status: 404,
        msg: "Quản lý không tồn tại.",
      };
    }

    if (manager.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với hỗ trợ.",
      };
    }

    return {
      success: true,
      msg: "Quản lý đã tải thành công.",
      managerInfo: manager,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thông tin quản lý: ", error);
    throw throwError(error);
  }
};

const createManagerService = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  gender,
  dateOfBirth,
  role,
}) => {
  try {
    const exists = await userModel.findOne({ email });
    if (exists) {
      if (!exists.isVerified) {
        await userModel.findByIdAndDelete(exists._id);
      } else {
        throw {
          status: 409,
          msg: "Email đã tồn tại.",
        };
      }
    }

    const manager = new userModel({
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
      role,
      isVerified: true,
    });

    await manager.save();

    return {
      success: true,
      msg: "Quản lý đã được tạo thành công.",
      manager,
    };
  } catch (error) {
    console.error("Lỗi khi tạo quản lý: ", error);
    throw throwError(error);
  }
};

const updateManagerByIdService = async ({
  managerId,
  firstName,
  lastName,
  email,
  phone,
  gender,
  dateOfBirth,
  role,
}) => {
  try {
    const manager = await userModel.findById(managerId);
    if (!manager) {
      throw {
        status: 404,
        msg: "Quản lý không tồn tại.",
      };
    }

    if (email && email !== manager.email) {
      const exists = await userModel.findOne({ email });
      if (exists) {
        throw {
          status: 409,
          msg: "Email đã tồn tại.",
        };
      }
    }

    const updatedManager = await userModel
      .findByIdAndUpdate(
        managerId,
        {
          firstName,
          lastName,
          email,
          phone,
          gender,
          dateOfBirth,
          role,
        },
        { new: true, lean: true }
      )
      .select("-password -refreshToken");

    return {
      success: true,
      msg: "Quản lý đã được cập nhật thành công.",
      manager: updatedManager,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật quản lý: ", error);
    throw throwError(error);
  }
};

const updateUserCurrentService = async ({
  userId,
  firstName,
  lastName,
  phone,
  gender,
  dateOfBirth,
  avatar,
}) => {
  const uploadedResources = [];

  const uploadImageAndTrack = async (path, mimetype, folder) => {
    const uploaded = await uploadToCloudinary(path, mimetype, folder);
    uploadedResources.push(uploaded.public_id);
    return uploaded;
  };

  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;

    const fName = firstName ?? user.firstName;
    const lName = lastName ?? user.lastName;
    if (fName || lName) {
      updateData.fullName = `${fName.trim()} ${lName.trim()}`;
    }

    if (avatar?.[0]?.path) {
      const uploaded = await uploadImageAndTrack(
        avatar[0].path,
        avatar[0].mimetype,
        "avatars"
      );

      if (user.avatarFileName) {
        const { success, detail } = await deleteFromCloudinary(
          user.avatarFileName
        );
        if (!success) {
          throw {
            status: 502,
            msg: "Không thể xóa logo trên Cloudinary.",
            detail,
          };
        }
      }

      updateData.avatarUrl = uploaded.secure_url;
      updateData.avatarFileName = uploaded.public_id;
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        select:
          "-refreshToken -password -role -verifyOtpToken -verifyOtpExpiry -passwordChangedAt",
      }
    );

    return {
      success: true,
      msg: "Người dùng đã được cập nhật thành công.",
      userInfo: updatedUser,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);

    await Promise.all(uploadedResources.map((id) => deleteFromCloudinary(id)));

    throw throwError(error);
  } finally {
    await cleanupTempFiles(avatar);
  }
};

const changeUserPasswordService = async ({ userId, password, newPassword }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const isPasswordValid = await user.isCorrectPassword(password);
    if (!isPasswordValid) {
      throw {
        status: 401,
        msg: "Mật khẩu hiện tại không đúng.",
      };
    }

    await user.save();

    return {
      success: true,
      msg: "Mật khẩu đã được cập nhật thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi thay đổi mật khẩu:", error);
    throw throwError(error);
  }
};

const requestEmailChangeService = async ({ userId, newEmail, password }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const isPasswordValid = await user.isCorrectPassword(password);
    if (!isPasswordValid) {
      throw {
        status: 401,
        msg: "Mật khẩu hiện tại không đúng.",
      };
    }

    const exists = await userModel.findOne({ email: newEmail });
    if (exists) {
      throw {
        status: 400,
        msg: "Email đã được sử dụng.",
      };
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.verifyOtpToken = hashedOtp;
    user.verifyOtpExpiry = otpExpiry;
    await user.save();

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;
    await sendMail({
      email: newEmail,
      html,
      subject: "Xác minh thay đổi email OTP",
    });

    return {
      success: true,
      msg: "OTP đã được gửi thành công. Vui lòng kiểm tra email.",
    };
  } catch (error) {
    console.error("Lỗi khi yêu cầu thay đổi email:", error);
    throw throwError(error);
  }
};

const resendEmailChangeOtpService = async ({ email, userId }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const otp = generateOTP();
    const otpExpiry = Date.now() + 5 * 60 * 1000;
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.verifyOtpToken = hashedOtp;
    user.verifyOtpExpiry = otpExpiry;
    await user.save();

    const html = `<p>Mã OTP của bạn là: <b>${otp}</b></p><p>OTP có hiệu lực trong 5 phút.</p>`;
    await sendMail({
      email,
      html,
      subject: "Xác minh thay đổi email OTP",
    });

    return {
      success: true,
      msg: "OTP đã được gửi thành công. Vui lòng kiểm tra email.",
    };
  } catch (error) {
    console.error("Lỗi khi yêu cầu thay đổi email:", error);
    throw throwError(error);
  }
};

const verifyEmailChangeOtpService = async ({ userId, email, otp }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const isMatch = await bcrypt.compare(otp, user.verifyOtpToken);
    if (!isMatch) {
      throw {
        status: 401,
        msg: "Mã OTP không đúng.",
      };
    }

    if (user.verifyOtpExpiry < Date.now()) {
      throw {
        status: 401,
        msg: "Mã OTP đã hết hạn.",
      };
    }

    user.email = email;
    user.newEmail = null;
    user.verifyOtpToken = null;
    user.verifyOtpExpiry = null;
    await user.save();

    return {
      success: true,
      msg: "Email đã được thay đổi thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi xác minh thay đổi email:", error);
    throw throwError(error);
  }
};

const updateUserBlockStatusService = async ({ userId, isBlocked }) => {
  try {
    const isBlockedUser = toBoolean(isBlocked);

    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findById(userId);
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    if (user.role === "admin" && isBlockedUser) {
      throw {
        status: 403,
        msg: "Không thể khóa người dùng có vai trò admin.",
      };
    }

    if (user.isBlocked === isBlockedUser) {
      return {
        success: true,
        msg: `${
          isBlockedUser
            ? "Chặn khách hàng thành công."
            : "Bỏ chặn khách hàng thành công."
        }`,
      };
    }

    user.isBlocked = isBlockedUser;
    await user.save();

    return {
      success: true,
      msg: `${
        isBlockedUser
          ? "Chặn khách hàng thành công."
          : "Bỏ chặn khách hàng thành công."
      }`,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái khóa người dùng:", error);
    throw throwError(error);
  }
};

const updateUserByAdminService = async ({ userId, body }) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      { _id: userId },
      { $set: body },
      {
        new: true,
        select:
          "-refreshToken -password -role -verifyOtpToken -verifyOtpExpiry -passwordChangedAt",
      }
    );

    if (!updatedUser) {
      return {
        success: false,
        msg: "Người dùng không tồn tại.",
      };
    }

    return {
      success: true,
      msg: "Người dùng đã được cập nhật thành công.",
      updatedUser,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng: ", error);
    throw throwError(error);
  }
};

const logoutService = async ({ refreshToken }) => {
  try {
    const user = await userModel.findOneAndUpdate(
      { refreshToken },
      { $unset: { refreshToken: 1 } },
      { new: true }
    );

    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    return {
      success: true,
      msg: "Đăng xuất thành công.",
    };
  } catch (error) {
    console.error("Lỗi khi đăng xuất: ", error);
    throw throwError(error);
  }
};

const refreshAccessTokenService = async ({ refreshToken }) => {
  try {
    if (!refreshToken) {
      throw {
        status: 400,
        msg: "Refresh token không hợp lệ.",
      };
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      throw {
        status: 401,
        msg: "Refresh token không hợp lệ.",
      };
    }

    if (!mongoose.Types.ObjectId.isValid(decodedToken.id)) {
      throw {
        status: 400,
        msg: "ID người dùng không hợp lệ.",
      };
    }

    const user = await userModel.findOne({
      _id: decodedToken.id,
      refreshToken: refreshToken,
    });

    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    if (user.isBlocked) {
      throw {
        status: 423,
        msg: "Tài khoản của bạn đã bị khóa.",
      };
    }

    if (!user.isVerified) {
      throw {
        status: 422,
        msg: "Tài khoản của bạn chưa được xác thực.",
      };
    }

    const newAccessToken = generateAccessToken(user.id, user.role);

    return {
      success: true,
      newAccessToken,
    };
  } catch (error) {
    console.error("Lỗi khi Refreshing AccessToken: ", error);
    throw throwError(error);
  }
};

const loginWithGoogleService = async ({ googleId, res }) => {
  try {
    if (!googleId) {
      throw {
        status: 400,
        msg: "Google ID không hợp lệ.",
      };
    }

    const user = await userModel.findOne({ googleId });
    if (!user) {
      throw {
        status: 404,
        msg: "Người dùng không tồn tại.",
      };
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      success: true,
      msg: "Đăng nhập thành công.",
      accessToken,
      userData: user,
    };
  } catch (error) {
    console.error("Lỗi khi Login With Google: ", error);
    throw throwError(error);
  }
};

module.exports = {
  loginService,
  registerService,
  verifyRegisterOtpService,
  sendResetPasswordEmailService,
  verifyResetPasswordOtpService,
  resetPasswordService,
  getUserCurrentService,
  getAllUsersService,
  getAllManagersService,
  getManagerByIdService,
  updateUserCurrentService,
  updateUserByAdminService,
  logoutService,
  refreshAccessTokenService,
  loginWithGoogleService,
  updateUserBlockStatusService,
  resendRegisterOtpService,
  resendResetPasswordOtpService,
  createManagerService,
  updateManagerByIdService,
  changeUserPasswordService,
  requestEmailChangeService,
  resendEmailChangeOtpService,
  verifyEmailChangeOtpService,
};
