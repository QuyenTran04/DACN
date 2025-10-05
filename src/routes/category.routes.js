const category = require("../controllers/category.controller");
const middlewares = require("../middlewares/auth");
const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");


router.post(
    "/createCategory",
    middlewares.requireAuth,
    middlewares.requireRole("admin"),
    upload.single("icon"),
    category.createCategory
);
router.get("/getCategories", category.getCategories);
module.exports = router;