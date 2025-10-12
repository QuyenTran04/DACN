const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const cloudinary = require("../configs/cloudinary");
const { bufferToDataURI } = require("../utils/file");
/** Helper: kiểm tra quyền với Course */
async function assertCanEditCourse(courseId, user) {
  const course = await Course.findById(courseId).select("instructor title");
  if (!course) {
    const err = new Error("Không tìm thấy khóa học");
    err.status = 404;
    throw err;
  }
  const isOwner = course.instructor?.toString() === user.id?.toString();
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    const err = new Error("Bạn không có quyền thao tác trên khóa học này");
    err.status = 403;
    throw err;
  }
  return course;
}

/** POST /api/lessons */
exports.createLesson = async (req, res) => {
  try {
    const instructor = req.user?.id;
    const { course, title, content, order, resources } = req.body;

    if (!course || !title)
      return res.status(400).json({ message: "Thiếu course hoặc title" });

    let videoUrl;

    // Nếu FE upload video qua form-data
    if (req.file) {
      const dataURI = bufferToDataURI(req.file.buffer, req.file.mimetype);
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "lms/lessons/videos",
        resource_type: "video",
        chunk_size: 60000000, // 6MB (upload lớn)
      });
      videoUrl = uploaded.secure_url;
    }

    const lesson = await Lesson.create({
      course,
      title,
      videoUrl,
      content,
      order,
      resources,
    });

    res.status(201).json({ message: "Tạo bài học thành công", lesson });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

/** GET /api/lessons/:id */
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate({
      path: "course",
      select: "title instructor",
    });
    if (!lesson)
      return res.status(404).json({ message: "Không tìm thấy bài học" });
    return res.json({ lesson });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

/** GET /api/courses/:courseId/lessons?keyword=&page=1&limit=20 */
exports.listLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { keyword = "", page = 1, limit = 50 } = req.query;

    const filter = {
      course: courseId,
      ...(keyword ? { title: { $regex: keyword, $options: "i" } } : {}),
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Lesson.find(filter)
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Lesson.countDocuments(filter),
    ]);

    return res.json({
      items,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

/** PUT /api/lessons/:id */
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    delete payload.course; // không cho đổi course

    const lesson = await Lesson.findById(id);
    if (!lesson)
      return res.status(404).json({ message: "Không tìm thấy bài học" });

    await assertCanEditCourse(lesson.course, req.user);

    // Nếu cập nhật order mà không truyền, bỏ qua
    const updated = await Lesson.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });

    return res.json({ message: "Cập nhật thành công", lesson: updated });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Lỗi server" });
  }
};

/** DELETE /api/lessons/:id */
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findById(id);
    if (!lesson)
      return res.status(404).json({ message: "Không tìm thấy bài học" });

    await assertCanEditCourse(lesson.course, req.user);

    await lesson.deleteOne();
    return res.json({ message: "Đã xóa bài học" });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Lỗi server" });
  }
};

/** PATCH /api/courses/:courseId/lessons/reorder
 * body: { order: ["lessonId1", "lessonId2", ...] }
 * Gán order = vị trí trong mảng (bắt đầu từ 1)
 */
exports.reorderLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: "Thiếu mảng order" });
    }

    await assertCanEditCourse(courseId, req.user);

    const bulkOps = order.map((lessonId, idx) => ({
      updateOne: {
        filter: { _id: lessonId, course: courseId },
        update: { $set: { order: idx + 1 } },
      },
    }));

    const { modifiedCount } = await Lesson.bulkWrite(bulkOps);
    return res.json({ message: "Cập nhật thứ tự thành công", modifiedCount });
  } catch (err) {
    return res
      .status(err.status || 500)
      .json({ message: err.message || "Lỗi server" });
  }
};
