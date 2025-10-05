const cloudinary = require("../configs/cloudinary");
const Category = require("../models/Category");

const bufferToDataURI = (buffer, mimetype) =>
  `data:${mimetype};base64,${buffer.toString("base64")}`;

exports.createCategory = async (req, res) => {
  try {
    const {name, parent, isActive } = req.body;
    if (!name) return res.status(400).json({ message: "Thiếu tên danh mục" });

    let iconUrl, iconPublicId;

    if (req.file) {
      const dataURI = bufferToDataURI(req.file.buffer, req.file.mimetype);
      const uploaded = await cloudinary.uploader.upload(dataURI, {
        folder: "lms/categories/icons",
        resource_type: "image",
      });
      iconUrl = uploaded.secure_url;
      iconPublicId = uploaded.public_id;
    }

    const doc = await Category.create({
      name,
      parent: parent || null,
      isActive: isActive !== undefined ? isActive : true,
      iconUrl,
      iconPublicId,
    });

    return res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Tạo danh mục thất bại" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    return res.json(categories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lấy danh mục thất bại" });
    }
};




