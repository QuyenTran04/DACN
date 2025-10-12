const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      // Hình ảnh
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/svg+xml",

      // Video
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/mkv",
      "video/quicktime",

      // Tài liệu cho AI quiz
      "application/pdf",
      "application/msword", // .doc (cũ)
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Không hỗ trợ định dạng này. Chỉ cho phép ảnh (JPG/PNG/WebP/SVG), video (MP4/WebM/MKV/MOV) hoặc tài liệu (PDF/DOC/DOCX)."
        )
      );
    }
  },
});

module.exports = upload;
