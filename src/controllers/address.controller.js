const addressService = require("../services/address.service");
const { handleError } = require("../utils/handleError.util");

const createUserAddress = async (req, res) => {
  try {
    const { id } = req.user;
    
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
      userId: id,
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

const getUserAddresses = async (req, res) => {
  try {
    const { id } = req.user;

    const result = await addressService.getUserAddressesService({
      userId: id,
      query: req.query,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getUserAddressById = async (req, res) => {
  try {
    const { id } = req.user;
    const { addressId } = req.params;

    const result = await addressService.getUserAddressByIdService({
      userId: id,
      addressId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const updateUserAddressById = async (req, res) => {
  try {
    const { id } = req.user;
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
      userId: id,
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

const updateDefaultUserAddress = async (req, res) => {
  try {
    const { id } = req.user;
    const { addressId } = req.params;

    const result = await addressService.updateDefaultUserAddressService({
      userId: id,
      addressId,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteUserAddressById = async (req, res) => {
  try {
    const { id } = req.user;
    const { addressId } = req.params;

    const result = await addressService.deleteUserAddressByIdService({
      userId: id,
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
