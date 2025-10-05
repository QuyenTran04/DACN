const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/mkv",
      "video/quicktime",
    ].includes(file.mimetype);
    ok
      ? cb(null, true)
      : cb(
          new Error(
            "Chỉ cho phép ảnh (JPG/PNG/WebP/SVG) hoặc video (MP4/WebM/MKV/MOV)"
          )
        );
  },
});

module.exports = upload;
