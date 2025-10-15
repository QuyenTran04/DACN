// controllers/course.controller.js
const Course = require("../models/Course");
const Category = require("../models/Category");
const cloudinary = require("../configs/cloudinary");

// Chuyển buffer -> data URI (cách bạn đang dùng là ok)
const bufferToDataURI = (buffer, mimetype) =>
  `data:${mimetype};base64,${buffer.toString("base64")}`;

// Helper: build filter từ query string
function buildFilterQuery(qs) {
  const filter = {};
  if (qs.q) {
    const regex = new RegExp(qs.q.trim(), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }
  if (qs.category) filter.category = qs.category;
  if (qs.instructor) filter.instructor = qs.instructor;
  if (qs.published === "true") filter.published = true;
  if (qs.published === "false") filter.published = false;

  if (qs.minPrice || qs.maxPrice) {
    filter.price = {};
    if (qs.minPrice) filter.price.$gte = Number(qs.minPrice);
    if (qs.maxPrice) filter.price.$lte = Number(qs.maxPrice);
  }
  return filter;
}

// Helper: parse sort query -> object
function parseSort(sortStr) {
  if (!sortStr) return { createdAt: -1 };
  return sortStr.split(",").reduce((acc, key) => {
    key = key.trim();
    if (!key) return acc;
    if (key.startsWith("-")) acc[key.slice(1)] = -1;
    else acc[key] = 1;
    return acc;
  }, {});
}

// POST /api/courses
exports.createCourse = async (req, res) => {
  try {
    const instructor = req.user?.id || req.user?._id;
    if (!instructor) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    const { title, description, category, published, price } = req.body;

    console.log("Du lieu:", { title, description, category, published, price, file: req.file ? true : false });
    if (!title || !description || !category) {
      return res
        .status(400)
        .json({ message: "Thiếu title, description hoặc category" });
    }

    let imageUrl;
    if (req.file) {
      const dataURI = bufferToDataURI(req.file.buffer, req.file.mimetype);
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "lms/courses/images",
        resource_type: "image",
      });
      imageUrl = uploaded.secure_url;
    }

    const course = await Course.create({
      title,
      description,
      category,
      instructor,
      published,
      price, 
      imageUrl,
    });

    return res.status(201).json(course);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Tạo khóa học thất bại" });
  }
};



exports.getCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      select, // vd: "title,price,imageUrl"
      sort, // vd: "-createdAt,price"
    } = req.query;

    const filter = buildFilterQuery(req.query);
    const sortObj = parseSort(sort);
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Course.find(filter)
        .select(select ? select.split(",").join(" ") : "")
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .populate("category", "name")
        .populate("instructor", "name email avatar role")
        .lean(),
      Course.countDocuments(filter),
    ]);

    return res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      items,
    });
  } catch (err) {
    console.error("getCourses error:", err);
    return res.status(500).json({ message: "Lấy khóa học thất bại" });
  }
};

exports.getCoursesByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const courses = await Course.find({ instructor: instructorId })
      .sort({ createdAt: -1 }) // mới nhất trước
      .populate("category", "name")
      .populate("instructor", "name email avatar role")
      .lean();

    if (!courses.length) {
      return res
        .status(404)
        .json({ message: "Giảng viên chưa có khóa học nào" });
    }

    return res.json({ total: courses.length, items: courses });
  } catch (err) {
    console.error("getCoursesByInstructor error:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy khóa học theo instructor" });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    console.log("Fetching course with ID:", courseId);
    const courses = await Course.findById(courseId);

    return res.json(courses);
  } catch (err) {
    console.error("getCourseById error:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy khóa học của bạn" });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params; // lấy id khóa học từ URL
    const { title, description, price, category, published } = req.body || {};

    // Tìm course trước
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Không tìm thấy khóa học" });
    }

    // Nếu có thay category -> cập nhật cả categoryName
    if (category) {
      const cat = await Category.findById(category).lean();
      if (!cat) {
        return res.status(404).json({ message: "Category không tồn tại" });
      }
      course.category = category;
      course.categoryName = cat.name;
    }

    // Cập nhật các field cơ bản
    if (title) course.title = title.trim();
    if (description) course.description = description.trim();
    if (price !== undefined) course.price = Number(price);
    if (published !== undefined) course.published = Boolean(published);

    // Nếu có file ảnh mới
    if (req.file?.buffer) {
      const dataURI = bufferToDataURI(req.file.buffer, req.file.mimetype);
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "lms/courses/images",
        resource_type: "image",
      });

      // Nếu trước đó bạn có lưu public_id thì nên xoá ảnh cũ
      if (course.imagePublicId) {
        await cloudinary.uploader.destroy(course.imagePublicId);
      }

      course.imageUrl = uploaded.secure_url;
      course.imagePublicId = uploaded.public_id;
    }

    // Lưu lại
    await course.save();
    const updated = await Course.findById(course._id)
      .populate("category", "name")
      .populate("instructor", "name email avatar role")
      .lean();

    return res.json({
      message: "Cập nhật khóa học thành công",
      course: updated,
    });
  } catch (err) {
    console.error("updateCourse error:", err);
    return res.status(500).json({ message: "Cập nhật khóa học thất bại" });
  }
};
