const router = require("express").Router();
const auth = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth");

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", requireAuth, auth.me);
router.post("/logout", auth.logout);
router.post("/google", auth.loginWithGoogle);


module.exports = router;
