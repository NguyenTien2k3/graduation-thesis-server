const userService = require("../services/user.service");
const { handleError } = require("../utils/handleError.util");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await userService.loginService({ email, password });

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, gender, dateOfBirth } =
      req.body;

    const result = await userService.registerService({
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
    });

    req.session.email = email;

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const resendRegisterOtp = async (req, res) => {
  try {
    const email = req.session.email;

    console.log(email);

    const result = await userService.resendRegisterOtpService({ email });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const verifyRegisterOtp = async (req, res) => {
  try {
    const email = req.session.email;

    console.log(email);

    const { otp } = req.body;

    const result = await userService.verifyRegisterOtpService({ email, otp });

    delete req.session.email;

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const sendResetPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await userService.sendResetPasswordEmailService({ email });

    req.session.email = email;

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const verifyResetPasswordOtp = async (req, res) => {
  try {
    const email = req.session.email;

    const { otp } = req.body;

    const result = await userService.verifyResetPasswordOtpService({
      email,
      otp,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const resendResetPasswordOtp = async (req, res) => {
  try {
    const email = req.session.email;

    const result = await userService.resendResetPasswordOtpService({ email });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = req.session.email;

    const { password } = req.body;

    const result = await userService.resetPasswordService({ email, password });

    delete req.session.email;

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await userService.getAllUsersService({ query: req.query });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllManagers = async (req, res) => {
  try {
    const result = await userService.getAllManagersService({
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getManagerById = async (req, res) => {
  try {
    const { managerId } = req.params;

    const result = await userService.getManagerByIdService({ managerId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const createManager = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
      role,
    } = req.body;

    const result = await userService.createManagerService({
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      dateOfBirth,
      role,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateManagerById = async (req, res) => {
  try {
    const { managerId } = req.params;
    const { firstName, lastName, email, phone, gender, dateOfBirth, role } =
      req.body;

    const result = await userService.updateManagerByIdService({
      managerId,
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      role,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserCurrent = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await userService.getUserCurrentService({ userId: id });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateUserCurrent = async (req, res) => {
  const avatar = req.files?.avatar || [];

  try {
    const { id } = req.user;
    const { firstName, lastName, phone, gender, dateOfBirth } = req.body;

    const result = await userService.updateUserCurrentService({
      userId: id,
      firstName,
      lastName,
      phone,
      gender,
      dateOfBirth,
      avatar,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { password, newPassword } = req.body;

    const result = await userService.changeUserPasswordService({
      userId: id,
      password,
      newPassword,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const requestEmailChange = async (req, res) => {
  try {
    const { id } = req.user;
    const { newEmail, password } = req.body;

    const result = await userService.requestEmailChangeService({
      userId: id,
      newEmail,
      password,
    });

    req.session.email = newEmail;

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const resendEmailChangeOtp = async (req, res) => {
  try {
    const { id } = req.user;
    const email = req.session.email;

    const result = await userService.resendEmailChangeOtpService({
      userId: id,
      email,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const verifyEmailChangeOtp = async (req, res) => {
  try {
    const { id } = req.user;
    const email = req.session.email;
    const { otp } = req.body;

    const result = await userService.verifyEmailChangeOtpService({
      userId: id,
      email,
      otp,
    });

    delete req.session.email;

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await userService.updateUserByAdminService({
      userId,
      body: req.body,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateUserBlockStatus = async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;

    const result = await userService.updateUserBlockStatusService({
      userId,
      isBlocked,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        msg: "No refresh token provided in cookies",
      });
    }

    const result = await userService.logoutService({ refreshToken });

    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        msg: "No refresh token provided in cookies",
      });
    }

    const result = await userService.refreshAccessTokenService({
      refreshToken,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const loginWithGoogle = async (req, res) => {
  try {
    const { googleId } = req.body;

    const result = await userService.loginWithGoogleService({ googleId, res });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  login,
  register,
  verifyRegisterOtp,
  sendResetPasswordEmail,
  verifyResetPasswordOtp,
  resetPassword,
  getAllUsers,
  getUserCurrent,
  updateUserCurrent,
  updateUserByAdmin,
  updateUserBlockStatus,
  logout,
  refreshAccessToken,
  loginWithGoogle,
  resendRegisterOtp,
  resendResetPasswordOtp,
  getAllManagers,
  getManagerById,
  createManager,
  updateManagerById,
  changeUserPassword,
  requestEmailChange,
  resendEmailChangeOtp,
  verifyEmailChangeOtp,
};
