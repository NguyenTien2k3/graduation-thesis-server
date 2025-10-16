require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");
const mongoose = require("mongoose");

const userModel = require("../src/models/user.model");
const productItemModel = require("../src/models/productItem.model");
const interactionModel = require("../src/models/interaction.model");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    if (conn.connection.readyState === 1) console.log("DB connection is successfully!")
    else console.log("DB connecting")
  } catch (error) {
    console.error("Kết nối MongoDB thất bại:", error.message);
    process.exit(1);
  }
};

async function exportDataToCsv() {
  try {
    await connectDB();

    const userPipeline = [
      {
        $project: {
          _id: 1,
          gender: { $ifNull: ["$gender", ""] },
          age: {
            $dateDiff: {
              startDate: { $ifNull: ["$dateOfBirth", new Date()] },
              endDate: "$$NOW",
              unit: "year",
            },
          },
        },
      },
    ];

    const productPipeline = [
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "brands",
          localField: "product.brandId",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category.parentId",
          foreignField: "_id",
          as: "categoryParent",
        },
      },
      {
        $project: {
          _id: 1,
          color: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$attributes",
                      as: "attr",
                      cond: { $eq: ["$$attr.code", "Màu"] },
                    },
                  },
                  as: "a",
                  in: "$$a.value",
                },
              },
              0,
            ],
          },
          storage: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$attributes",
                      as: "attr",
                      cond: { $eq: ["$$attr.code", "Dung lượng"] },
                    },
                  },
                  as: "a",
                  in: "$$a.value",
                },
              },
              0,
            ],
          },
          version: {
            $arrayElemAt: [
              {
                $map: {
                  input: {
                    $filter: {
                      input: "$attributes",
                      as: "attr",
                      cond: { $eq: ["$$attr.code", "Phiên bản"] },
                    },
                  },
                  as: "a",
                  in: "$$a.value",
                },
              },
              0,
            ],
          },
          brand: { $ifNull: ["$brand.name", ""] },
          category1: {
            $ifNull: [{ $arrayElemAt: ["$categoryParent.name", 0] }, "Unknown"],
          },
          category2: { $ifNull: ["$category.name", ""] },
          price: { $ifNull: ["$retailPrice", 0] },
        },
      },
      {
        $set: {
          color: { $ifNull: ["$color", ""] },
          storage: { $ifNull: ["$storage", ""] },
          version: { $ifNull: ["$version", ""] },
          price: { $ifNull: ["$price", 0] },
        },
      },
    ];

    const interactionPipeline = [
      {
        $project: {
          _id: 1,
          userId: 1,
          productId: 1,
          type: { $ifNull: ["$type", ""] },
          createdAt: 1,
        },
      },
    ];

    const [users, products, interactions] = await Promise.all([
      userModel.aggregate(userPipeline),
      productItemModel.aggregate(productPipeline),
      interactionModel.aggregate(interactionPipeline),
    ]);

    const userData = users.map((user) => ({
      id: user._id,
      age: user.age || 0,
      gender: user.gender || "",
    }));

    const productData = products.map((product) => ({
      id: product._id,
      color: product.color || "",
      storage: product.storage || "",
      version: product.version || "",
      brand: product.brand || "",
      category1: product.category1 || "Unknown",
      category2: product.category2 || "",
      price: product.price || 0,
    }));

    const interactionData = interactions.map((i) => ({
      id: i._id,
      userId: i.userId,
      productId: i.productId,
      type: i.type,
      createdAt: i.createdAt,
    }));

    const userFields = [
      { label: "ID", value: "id" },
      { label: "Age", value: "age" },
      { label: "Gender", value: "gender" },
    ];

    const productFields = [
      { label: "ID", value: "id" },
      { label: "Color", value: "color" },
      { label: "Storage", value: "storage" },
      { label: "Version", value: "version" },
      { label: "Brand", value: "brand" },
      { label: "Category1", value: "category1" },
      { label: "Category2", value: "category2" },
      { label: "Price", value: "price" },
    ];

    const interactionFields = [
      { label: "ID", value: "id" },
      { label: "User ID", value: "userId" },
      { label: "Product ID", value: "productId" },
      { label: "Type", value: "type" },
      { label: "Created At", value: "createdAt" },
    ];

    const userCsvParser = new Parser({ fields: userFields });
    const userCsv = userCsvParser.parse(userData);

    const productCsvParser = new Parser({ fields: productFields });
    const productCsv = productCsvParser.parse(productData);

    const interactionCsvParser = new Parser({ fields: interactionFields });
    const interactionCsv = interactionCsvParser.parse(interactionData);

    const exportDir = path.join(__dirname, "../scripts");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(path.join(exportDir, "users.csv"), userCsv, "utf8");
    fs.writeFileSync(path.join(exportDir, "products.csv"), productCsv, "utf8");
    fs.writeFileSync(
      path.join(exportDir, "interactions.csv"),
      interactionCsv,
      "utf8"
    );

    console.log(
      "Xuất dữ liệu thành công vào scripts/: users.csv, products.csv, interactions.csv"
    );

    await mongoose.disconnect();
  } catch (error) {
    console.error("Lỗi khi xuất dữ liệu:", error.message);
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  exportDataToCsv();
}
