const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  if (status >= 400 && status <= 599 && Number.isInteger(status)) {
    if (status >= 500) {
      console.error("Queralyth server error:", err.stack || err.message)
      res.status(status).json({
        status: "error",
        message: "Internal server error.",
      });
    } else {
      res.status(status).json({
        status: "error",
        message: err.message || "Request failed",
      });
    }
  } else {
    status = 500;
    console.error("Queralyth server error:", err.stack || err.message)
    res.status(status).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

export default errorHandler
