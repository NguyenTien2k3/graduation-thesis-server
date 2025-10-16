const orderService = require("../services/order.service");
const { handleError } = require("../utils/handleError.util");

const placeOrderByCod = async (req, res) => {
  try {
    const { id } = req.user;

    const { items, shippingAddress, vouchers, coupons } = req.body;

    const totalAmount = Number(req.body.totalAmount);

    const result = await orderService.placeOrderByCodService({
      userId: id,
      items,
      shippingAddress,
      totalAmount,
      vouchers,
      coupons,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const placeOrderByMoMo = async (req, res) => {
  try {
    const { id } = req.user;
    const { items, shippingAddress, vouchers, coupons } = req.body;

    const totalAmount = Number(req.body.totalAmount);

    const result = await orderService.placeOrderByMoMoService({
      userId: id,
      items,
      shippingAddress,
      totalAmount,
      vouchers,
      coupons,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const handleMoMoCallback = async (req, res) => {
  try {
    const callbackData = req.body;

    const result = await orderService.handleMoMoCallbackService({
      callbackData,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const checkMoMoTransactionStatus = async (req, res) => {
  try {
    const { orderId } = req.body;

    const result = await orderService.checkMoMoTransactionStatusService({
      orderId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const checkPaymentMoMo = async (req, res) => {
  try {
    const {
      orderId,
      resultCode,
      message,
      amount,
      signature,
      requestId,
      partnerCode,
      extraData,
    } = req.query;

    const result = await orderService.checkPaymentMoMoService({
      orderId,
      resultCode,
      message,
      amount,
      signature,
      requestId,
      partnerCode,
      extraData,
      res,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateOrderStatusByAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const result = await orderService.updateOrderStatusByAdminService({
      orderId,
      status,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelOrderByUser = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancelReason } = req.body;
    const { id } = req.user;

    const result = await orderService.cancelOrderByUserService({
      userId: id,
      orderId,
      cancelReason,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllOrders = async (req, res) => {
  try {
    const result = await orderService.getAllOrdersService({ query: req.query });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAllUserOrders = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await orderService.getAllUserOrdersService({ userId: id });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await orderService.getOrderByIdService({ orderId });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  placeOrderByCod,
  placeOrderByMoMo,
  updateOrderStatusByAdmin,
  cancelOrderByUser,
  getAllOrders,
  getAllUserOrders,
  getOrderById,
  checkPaymentMoMo,
  handleMoMoCallback,
  checkMoMoTransactionStatus,
};
