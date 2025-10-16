const handleError = (res, error) => {
  const status = error.status || 500;
  const msg = error.msg || "Lỗi máy chủ nội bộ.";

  return res.status(status).json({
    success: false,
    msg,
  });
};

const throwError = (error) => {
  if (error && error.status) throw error;
  throw {
    status: 500,
    msg: "Lỗi máy chủ nội bộ.",
  };
};

module.exports = {
  handleError,
  throwError,
};
