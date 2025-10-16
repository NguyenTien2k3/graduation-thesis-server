const Joi = require("joi");
const router = require("express").Router();
const controller = require("../controllers/branch.controller");
const {
  validateDto,
  validateObjectId,
} = require("../middlewares/validation.middleware");
const {
  verifyAccessToken,
  allowRoles,
} = require("../middlewares/verifyToken.middleware");
const {
  createBranchValidation,
  updateBranchValidation,
} = require("../validations/branch.validation");
const {
  booleanRequiredValidation,
} = require("../validations/common.validation");

router.post(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  validateDto(createBranchValidation),
  controller.createBranch
);

router.get(
  "/",
  [verifyAccessToken, allowRoles("admin")],
  controller.getAllBranches
);

router.get(
  "/:branchId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("branchId")],
  controller.getBranchById
);

router.put(
  "/:branchId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("branchId")],
  validateDto(updateBranchValidation),
  controller.updateBranchById
);

router.put(
  "/:branchId/visibility",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("branchId")],
  validateDto(
    Joi.object({
      isActive: booleanRequiredValidation,
    })
  ),
  controller.updateBranchVisibilityById
);

router.delete(
  "/:branchId",
  [verifyAccessToken, allowRoles("admin"), validateObjectId("branchId")],
  controller.deleteBranchById
);

module.exports = router;
