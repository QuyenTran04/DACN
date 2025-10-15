const Course = require("../controllers/course.controller");
const middleware = require("../middlewares/auth");
const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");

router.post(
  "/createCourse",
  middleware.requireAuth,
  middleware.requireRole("admin", "instructor"),
  upload.single("imageUrl"),
  Course.createCourse
);
router.get(
  "/getCourses",
  Course.getCourses
);
router.get(
  "/getCoursesByInstructor/:instructorId",
  middleware.requireAuth,
  middleware.requireRole("admin", "instructor"),
  Course.getCoursesByInstructor
);
router.put(
  "/updateCourse/:id",
  middleware.requireAuth,
  middleware.requireRole("admin", "instructor"),
  upload.single("imageUrl"),
  Course.updateCourse
);
router.get("/getCourseById/:id", middleware.requireAuth, Course.getCourseById);

module.exports = router;