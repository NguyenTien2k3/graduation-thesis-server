const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/address.controller");
const { verifyAccessToken } = require("../middlewares/verifyToken.middleware");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  createAddressValidation,
  updateAddressValidation,
} = require("../validations/address.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken],
  validateDto(createAddressValidation),
  controller.createUserAddress
);

router.get("/", [verifyAccessToken], controller.getUserAddresses);

router.get(
  "/:addressId",
  [verifyAccessToken, validateObjectId("addressId")],
  controller.getUserAddressById
);

router.put(
  "/:addressId",
  [verifyAccessToken, validateObjectId("addressId")],
  validateDto(updateAddressValidation),
  controller.updateUserAddressById
);

router.put(
  "/default/:addressId",
  [verifyAccessToken, validateObjectId("addressId")],
  controller.updateDefaultUserAddress
);

router.delete(
  "/:addressId",
  [verifyAccessToken, validateObjectId("addressId")],
  controller.deleteUserAddressById
);

module.exports = router;
