// src/controllers/admin.controller.js
const User = require("../models/User");
const Course = require("../models/Course");
const Lesson = require("../models/Lesson");
const Quiz = require("../models/Quiz");
const Enrollment = require("../models/Enrollment");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Submission = require("../models/Submission");
const { buildQueryOpts, like } = require("../utils/query");

// --- OVERVIEW KPI ---
exports.getOverview = async (req, res) => {
  try {
    const [totalUsers, instructors, totalCourses, totalEnrollments] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: "instructor" }),
        Course.countDocuments({}),
        Enrollment.countDocuments({}),
      ]);

    const paidAgg = await Order.aggregate([
      { $match: { status: "paid" } },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$amount" },
          ordersCount: { $sum: 1 },
        },
      },
    ]);

    const revenue = paidAgg[0]?.revenue || 0;
    const ordersCount = paidAgg[0]?.ordersCount || 0;

    // doanh thu 30 ngày
    const revenue30d = await Order.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: { $gte: new Date(Date.now() - 30 * 864e5) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // top khóa học theo ghi danh
    const topCourses = await Enrollment.aggregate([
      { $group: { _id: "$course", students: { $sum: 1 } } },
      { $sort: { students: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      {
        $project: {
          courseId: "$course._id",
          title: "$course.title",
          students: 1,
          _id: 0,
        },
      },
    ]);

    // tiến độ TB
    const completion = await Enrollment.aggregate([
      { $group: { _id: null, avgProgress: { $avg: "$progress" } } },
    ]);

    res.json({
      cards: {
        totalUsers,
        instructors,
        totalCourses,
        totalEnrollments,
        revenue,
        ordersCount,
        avgProgress: Math.round(completion[0]?.avgProgress || 0),
      },
      charts: { revenue30d },
      tables: { topCourses },
    });
  } catch (e) {
    res.status(500).json({ message: "Lỗi lấy overview", error: e.message });
  }
};

// --- USERS ---
exports.listUsers = async (req, res) => {
  try {
    const { q, role, isActive } = req.query;
    const { limit, skip, sort, page } = buildQueryOpts(req, {
      limit: 20,
      sortBy: "createdAt",
      order: "desc",
    });

    const where = {
      ...(q ? { $or: [{ name: like(q) }, { email: like(q) }] } : {}),
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
    };

    const [items, total] = await Promise.all([
      User.find(where).sort(sort).skip(skip).limit(limit).select("-password"),
      User.countDocuments(where),
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi list users", error: e.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;
    const allowed = {};
    if (role) allowed.role = role;
    if (typeof isActive === "boolean") allowed.isActive = isActive;
    const user = await User.findByIdAndUpdate(id, allowed, {
      new: true,
    }).select("-password");
    res.json(user);
  } catch (e) {
    res
      .status(400)
      .json({ message: "Cập nhật user thất bại", error: e.message });
  }
};

// --- COURSES ---
exports.listCoursesAdmin = async (req, res) => {
  try {
    const { q, category, published } = req.query;
    const { limit, skip, sort, page } = buildQueryOpts(req, {
      limit: 20,
      sortBy: "createdAt",
    });

    const where = {
      ...(q ? { title: like(q) } : {}),
      ...(category ? { category } : {}),
      ...(published !== undefined ? { published: published === "true" } : {}),
    };

    const [items, total] = await Promise.all([
      Course.find(where)
        .populate("instructor", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Course.countDocuments(where),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi list courses", error: e.message });
  }
};

exports.togglePublishCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course)
      return res.status(404).json({ message: "Không tìm thấy khóa học" });
    course.published = !course.published;
    await course.save();
    res.json({ _id: course._id, published: course.published });
  } catch (e) {
    res
      .status(400)
      .json({ message: "Không thể cập nhật publish", error: e.message });
  }
};

// --- ORDERS ---
exports.listOrders = async (req, res) => {
  try {
    const { status, from, to, user } = req.query;
    const { limit, skip, sort, page } = buildQueryOpts(req, {
      limit: 20,
      sortBy: "createdAt",
      order: "desc",
    });

    const where = {
      ...(status ? { status } : {}),
      ...(user ? { user } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { $gte: new Date(from) } : {}),
              ...(to ? { $lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      Order.find(where)
        .populate("user", "name email")
        .populate("course", "title")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Order.countDocuments(where),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi list orders", error: e.message });
  }
};

// --- ENROLLMENTS ---
exports.listEnrollments = async (req, res) => {
  try {
    const { course, user, status } = req.query;
    const { limit, skip, sort, page } = buildQueryOpts(req);

    const where = {
      ...(course ? { course } : {}),
      ...(user ? { user } : {}),
      ...(status ? { status } : {}),
    };

    const [items, total] = await Promise.all([
      Enrollment.find(where)
        .populate("user", "name email")
        .populate("course", "title")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments(where),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi list enrollments", error: e.message });
  }
};

// --- REVIEWS moderation ---
exports.listReviews = async (req, res) => {
  try {
    const { course } = req.query;
    const { limit, skip, sort, page } = buildQueryOpts(req);
    const where = { ...(course ? { course } : {}) };
    const [items, total] = await Promise.all([
      Review.find(where)
        .populate("user", "name")
        .populate("course", "title")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Review.countDocuments(where),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ message: "Lỗi list reviews", error: e.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: "Xóa review thất bại", error: e.message });
  }
};

// --- COURSE ANALYTICS ---
exports.courseAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const [enrolls, revenueByDay, reviewStats, quizStats] = await Promise.all([
      Enrollment.aggregate([
        {
          $match: {
            course: require("mongoose").Types.ObjectId.createFromHexString(id),
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgProgress: { $avg: "$progress" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            course: require("mongoose").Types.ObjectId.createFromHexString(id),
            status: "paid",
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        {
          $match: {
            course: require("mongoose").Types.ObjectId.createFromHexString(id),
          },
        },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Submission.aggregate([
        {
          $match: {
            course: require("mongoose").Types.ObjectId.createFromHexString(id),
          },
        },
        {
          $group: {
            _id: "$quiz",
            attempts: { $sum: 1 },
            correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          },
        },
        { $sort: { attempts: -1 } },
      ]),
    ]);

    res.json({ enrolls, revenueByDay, reviewStats, quizStats });
  } catch (e) {
    res.status(500).json({ message: "Lỗi analytics", error: e.message });
  }
};
