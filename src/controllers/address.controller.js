const addressService = require("../services/address.service");
const { handleError } = require("../utils/handleError.util");

/**
 * [POST] Tạo địa chỉ mới cho người dùng.
 * Lấy userId từ token (req.user) và dữ liệu địa chỉ từ req.body.
 */
const createUserAddress = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const {
      fullName,
      phone,
      addressLine,
      ward,
      district,
      province,
      type,
      location,
      isDefault,
    } = req.body;

    const result = await addressService.createUserAddressService({
      userId,
      fullName,
      phone,
      addressLine,
      ward,
      district,
      province,
      type,
      location,
      isDefault,
    });

    return res.status(201).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * [GET] Lấy danh sách tất cả địa chỉ của người dùng.
 * Lấy userId từ token và query string (pagination, filtering) từ req.query.
 */
const getUserAddresses = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const result = await addressService.getUserAddressesService({
      userId,
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * [GET] Lấy thông tin một địa chỉ theo ID.
 * Đảm bảo người dùng chỉ lấy địa chỉ của chính họ bằng cách truyền userId và addressId.
 */
const getUserAddressById = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { addressId } = req.params;

    const result = await addressService.getUserAddressByIdService({
      userId,
      addressId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * [PUT] Cập nhật thông tin địa chỉ theo ID.
 * Lấy addressId từ params và dữ liệu cập nhật từ body.
 */
const updateUserAddressById = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { addressId } = req.params;

    const {
      fullName,
      phone,
      addressLine,
      ward,
      district,
      province,
      type,
      location,
      isDefault,
    } = req.body;

    const result = await addressService.updateUserAddressByIdService({
      userId,
      addressId,
      fullName,
      phone,
      addressLine,
      ward,
      district,
      province,
      type,
      location,
      isDefault,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * [PUT] Đặt một địa chỉ làm mặc định.
 * Chỉ cần userId và addressId để thực hiện nghiệp vụ.
 */
const updateDefaultUserAddress = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { addressId } = req.params;

    const result = await addressService.updateDefaultUserAddressService({
      userId,
      addressId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * [DELETE] Xóa một địa chỉ theo ID.
 * Đảm bảo người dùng chỉ xóa địa chỉ của chính họ.
 */
const deleteUserAddressById = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { addressId } = req.params;

    const result = await addressService.deleteUserAddressByIdService({
      userId,
      addressId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  createUserAddress,
  getUserAddresses,
  getUserAddressById,
  updateUserAddressById,
  updateDefaultUserAddress,
  deleteUserAddressById,
};
