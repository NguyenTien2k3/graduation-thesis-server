const Joi = require("joi");
const mongoose = require("mongoose");

const validateDto = (schema) => {
  return (req, res, next) => {
    try {

      if (req.body.product && typeof req.body.product === "string") {
        req.body.product = JSON.parse(req.body.product);
      }

      if (req.body.productItems && typeof req.body.productItems === "string") {
        req.body.productItems = JSON.parse(req.body.productItems);
      }

      if (req.body.productItem && typeof req.body.productItem === "string") {
        req.body.productItem = JSON.parse(req.body.productItem);
      }

      if (req.body.featuredImagesDelete && typeof req.body.featuredImagesDelete === "string") {
        req.body.featuredImagesDelete = JSON.parse(req.body.featuredImagesDelete);
      }

      if (req.body.productItemImagesDelete && typeof req.body.productItemImagesDelete === "string") {
        req.body.productItemImagesDelete = JSON.parse(req.body.productItemImagesDelete);
      }

      const { error } = schema.validate(req.body, { abortEarly: true });

      if (error) {
        return res.status(400).json({
          success: false,
          msg: error.details[0].message,
        });
      }

      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        msg: "Invalid JSON format in product or productItems",
      });
    }
  };
};


const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const schema = Joi.object({
      [paramName]: Joi.string()
        .custom((value, helpers) => {
          if (!mongoose.isValidObjectId(value)) {
            return helpers.error("any.invalid");
          }
          return value;
        }, "ObjectId validation")
        .required(),
    });

    const { error } = schema.validate(req.params);
    if (error) {
      return res
        .status(400)
        .json({ success: false, msg: `Invalid ${paramName}` });
    }

    next();
  };
};

module.exports = {
  validateDto,
  validateObjectId,
};
