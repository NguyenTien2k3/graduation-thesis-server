const { notFound, errorHandler } = require("../middlewares/errorHandler.middleware");
const user = require('./user.route');
const brand = require('./brand.route');
const category = require('./category.route');
const address = require('./address.route');
const product = require('./product.route');
const wishlist = require('./wishlist.route');
const inventory = require('./inventory.route');
const discount = require('./discount.route');
const coupon = require('./coupon.route');
const voucher = require('./voucher.route');
const cart = require('./cart.route');
const order = require('./order.route');
const supplier = require('./supplier.route');
const branch = require('./branch.route');
const userVoucher = require('./userVoucher.route');
const userCoupon = require('./userCounpon.route');
const importReceipt = require('./importReceipt.route');
const exportReceipt = require('./exportReceipt.route');
const notification = require('./notification.route');
const productReview = require('./productReview.route');

const initRoutes = (app) => {
    app.use('/api/v1/user', user);

    app.use('/api/v1/brand', brand);

    app.use('/api/v1/category', category);

    app.use('/api/v1/address', address);

    app.use('/api/v1/product', product);
    
    app.use('/api/v1/wishlist', wishlist);

    app.use('/api/v1/inventory', inventory);

    app.use('/api/v1/discount', discount);

    app.use('/api/v1/coupon', coupon);

    app.use('/api/v1/voucher', voucher);
    
    app.use('/api/v1/cart', cart);

    app.use('/api/v1/order', order);

    app.use('/api/v1/supplier', supplier);

    app.use('/api/v1/branch', branch);

    app.use('/api/v1/userVoucher', userVoucher);

    app.use('/api/v1/userCoupon', userCoupon);

    app.use('/api/v1/importReceipt', importReceipt);

    app.use('/api/v1/exportReceipt', exportReceipt);

    app.use('/api/v1/productReview', productReview);

    app.use('/api/v1/notification', notification);
    
    app.use(notFound);
    app.use(errorHandler);
};

module.exports = initRoutes;