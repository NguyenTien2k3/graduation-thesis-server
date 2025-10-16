const mongoose = require('mongoose');

const userCouponSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true,
    index: true,
  },
}, { timestamps: true });

userCouponSchema.index({ userId: 1, couponId: 1 }, { unique: true });

module.exports = mongoose.model('UserCoupon', userCouponSchema);
