const Joi = require("joi");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = require("express").Router();
const controller = require("../controllers/user.controller");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const upload = require("../middlewares/multer.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  registerValidation,
  createManagerValidation,
  updateManagerValidation,
  updateUserCurrentValidation,
} = require("../validations/user.validation");
const {
  objectIdRequiredValidation,
  numberRequiredValidation,
  stringRequiredValidation,
  emailRequiredValidation,
  passwordRequiredValidation,
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/login",
  validateDto(
    Joi.object({
      email: emailRequiredValidation,
      password: passwordRequiredValidation,
    })
  ),
  controller.login
);

router.post("/register", validateDto(registerValidation), controller.register);

router.post(
  "/resendRegisterOtp",
  validateDto(Joi.object({ email: emailRequiredValidation })),
  controller.resendRegisterOtp
);

router.post(
  "/verifyRegisterOtp",
  validateDto(
    Joi.object({
      email: emailRequiredValidation,
      otp: numberRequiredValidation,
    })
  ),
  controller.verifyRegisterOtp
);

router.post(
  "/sendResetPasswordEmail",
  validateDto(Joi.object({ email: emailRequiredValidation })),
  controller.sendResetPasswordEmail
);

router.post(
  "/resendResetPasswordOtp",
  validateDto(Joi.object({ email: emailRequiredValidation })),
  controller.resendResetPasswordOtp
);

router.post(
  "/verifyResetPasswordOtp",
  validateDto(
    Joi.object({
      email: emailRequiredValidation,
      otp: numberRequiredValidation,
    })
  ),
  controller.verifyResetPasswordOtp
);

router.post(
  "/resetPassword",
  validateDto(
    Joi.object({
      email: emailRequiredValidation,
      password: passwordRequiredValidation,
    })
  ),
  controller.resetPassword
);

router.post("/refreshAccessToken", controller.refreshAccessToken);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllUsers
);

router.get("/current", [verifyAccessToken], controller.getUserCurrent);

router.post(
  "/createManager",
  validateDto(createManagerValidation),
  controller.createManager
);

router.put(
  "/updateManager/:managerId",
  [verifyAccessToken, validateObjectId("managerId"), allowRoles("admin")],
  validateDto(updateManagerValidation),
  controller.updateManagerById
);

router.get(
  "/manager",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllManagers
);

router.get(
  "/manager/:managerId",
  [verifyAccessToken, validateObjectId("managerId"), allowRoles("admin")],
  controller.getManagerById
);

router.post("/logout", [verifyAccessToken], controller.logout);

router.put(
  "/changePassword",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      email: emailRequiredValidation,
      password: passwordRequiredValidation,
      newPassword: passwordRequiredValidation,
    })
  ),
  controller.changeUserPassword
);

router.put(
  "/current",
  [verifyAccessToken],
  upload.fields([{ name: "avatar", maxCount: 1 }]),
  validateDto(updateUserCurrentValidation),
  controller.updateUserCurrent
);

router.put(
  "/blockStatus",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(
    Joi.object({
      userId: objectIdRequiredValidation,
      isBlocked: booleanRequiredValidation,
    })
  ),
  controller.updateUserBlockStatus
);

router.put(
  "/:userId",
  [verifyAccessToken, validateObjectId("userId"), allowRoles("admin")],
  controller.updateUserByAdmin
);

router.post(
  "/requestEmailChange",
  [verifyAccessToken],
  validateDto(
    Joi.object({
      newEmail: emailRequiredValidation,
      password: passwordRequiredValidation,
    })
  ),
  controller.requestEmailChange
);

router.post(
  "/resendEmailChangeOtp",
  [verifyAccessToken],
  controller.resendEmailChangeOtp
);

router.post(
  "/verifyEmailChangeOtp",
  [verifyAccessToken],
  validateDto(Joi.object({ otp: numberRequiredValidation })),
  controller.verifyEmailChangeOtp
);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Google login error:", err);

      const errorMsg = encodeURIComponent(err.message || "Google login failed");
      return res.redirect(`${process.env.CLIENT_URL}/login?error=${errorMsg}`);
    }

    if (!user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=Login failed`);
    }

    const token = jwt.sign(
      { googleId: user.googleId },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    return res.redirect(
      `${process.env.CLIENT_URL}/verify-login-success/${token}`
    );
  })(req, res, next);
});

router.post("/loginWithGoogle", controller.loginWithGoogle);

module.exports = router;
