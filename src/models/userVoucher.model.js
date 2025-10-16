const mongoose = require('mongoose');

const userVoucherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  voucherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher',
    required: true,
    index: true,
  },
  isUsed: {
    type: Boolean,
    default: false
  },
}, { timestamps: true });

module.exports = mongoose.model('UserVoucher', userVoucherSchema);
