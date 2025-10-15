// src/utils/query.js
exports.buildQueryOpts = (
  req,
  defaults = { limit: 20, sortBy: "createdAt", order: "desc" }
) => {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, parseInt(req.query.limit || defaults.limit, 10));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || defaults.sortBy;
  const order =
    (req.query.order || defaults.order).toLowerCase() === "asc" ? 1 : -1;
  return { page, limit, skip, sort: { [sortBy]: order } };
};

exports.like = (value) =>
  value
    ? {
        $regex: String(value)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      }
    : undefined;
