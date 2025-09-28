const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.requireAuth = async (req, res, next) => {
  try {
    // Ưu tiên cookie, fallback Bearer
    const tokenFromCookie = req.cookies?.token;
    const tokenFromHeader = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    const token = tokenFromCookie || tokenFromHeader;
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { uid: decoded.uid, role: decoded.role };

    // (tuỳ chọn) kiểm tra user còn tồn tại/đang active
    const user = await User.findById(decoded.uid);
    if (!user)
      return res.status(401).json({ message: "Tài khoản không còn tồn tại" });

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.auth?.role || !roles.includes(req.auth.role))
      return res.status(403).json({ message: "Không có quyền truy cập" });
    next();
  };
};
