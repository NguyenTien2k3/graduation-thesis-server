const mongoose = require('mongoose');

var wishlistSchema = new mongoose.Schema({
    productItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductItem',
        required: true,
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);