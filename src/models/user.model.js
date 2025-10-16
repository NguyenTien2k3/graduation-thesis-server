const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLE, USER_GENDER } = require("../constants/user.constant");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      required: true,
      trim: true,
    },
    avatarFileName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: USER_GENDER,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: USER_ROLE,
      default: "user",
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    passwordChangedAt: {
      type: Date,
    },
    verifyOtpToken: {
      type: String,
    },
    verifyOtpExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  try {
    if (
      (this.isModified("firstName") ||
        this.isModified("lastName") ||
        this.isNew) &&
      this.firstName &&
      this.lastName
    ) {
      this.fullName = `${this.firstName} ${this.lastName}`.trim();
    }

    if (this.isModified("password") && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      if (!this.isNew) {
        this.passwordChangedAt = new Date();
      }
    }

    next();
  } catch (error) {
    console.error(
      `Error in pre-save middleware for User (email: ${this.email}):`,
      error.message
    );
    next(error);
  }
});

userSchema.methods = {
  isCorrectPassword: async function (password) {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  },
};

module.exports = mongoose.model("User", userSchema);
