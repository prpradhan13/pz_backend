import express from "express";
import {
  changeCurrentPassword,
  changeUserDetails,
  deleteUser,
  getCurrentUser,
  loginController,
  logoutController,
  refreshAccessToken,
  signupController,
  // verifyEmailController,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/user.middleware.js";

const router = express.Router();

router.post("/signup", signupController);

// router.get('/verify-email', verifyEmailController);

router.post("/login", loginController);

router.post("/logout", verifyJWT, logoutController);

// Regenerate token if time expired
router.post("/refresh-token", refreshAccessToken);

// Update user password
router.put("/user-password", verifyJWT, changeCurrentPassword);

// Get current User(Logged in user) and Update user details
router
  .route("/user-details")
  .get(verifyJWT, getCurrentUser) 
  .put(verifyJWT, changeUserDetails);

router.get("/auth-check", verifyJWT, (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome, ${req.user.username}`,
    data: req.user
  });
})

router.delete("/user-delete", verifyJWT, deleteUser)



export default router;
