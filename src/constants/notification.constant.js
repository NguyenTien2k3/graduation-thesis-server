module.exports = {
  NOTIFICATION_TYPE: ["order", "inventory", "export_receipt", "import_receipt"],
  NOTIFICATION_EVENT: [
    "created",
    "approved",
    "pending",
    "cancelled",
    "low_stock",
    "out_of_stock",
  ],
  RECEIVER_ROLE: [
    "user",
    "admin",
    "warehouse_manager",
    "product_manager",
    "user_manager",
    "customer_support",
  ],
};
