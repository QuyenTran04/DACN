const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.requireAuth = async (req, res, next) => {
  try {
    const tokenFromCookie = req.cookies?.token;
    const tokenFromHeader = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    const token = tokenFromCookie || tokenFromHeader;
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user trong DB để đảm bảo còn tồn tại
    const user = await User.findById(decoded.uid);
    if (!user) {
      return res.status(401).json({ message: "Tài khoản không còn tồn tại" });
    }

    // Gán vào req.user cho dễ dùng trong controller
    req.user = {
      id: decoded.uid,
      role: decoded.role,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
};
