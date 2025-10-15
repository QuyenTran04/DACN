const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth");
const admin = require("../controllers/admin.controller");

router.use(requireAuth, requireRole("admin"));

router.get("/overview", admin.getOverview);
router.get("/users", admin.listUsers);
router.patch("/users/:id", admin.updateUser);

router.get("/courses", admin.listCoursesAdmin);
router.patch("/courses/:id/publish", admin.togglePublishCourse);
router.get("/courses/:id/analytics", admin.courseAnalytics);

router.get("/orders", admin.listOrders);
router.get("/enrollments", admin.listEnrollments);

router.get("/reviews", admin.listReviews);
router.delete("/reviews/:id", admin.deleteReview);

module.exports = router;
