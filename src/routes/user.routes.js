import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  RefreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserProfile,
  updateAvatar,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

router.route("/refresh-token").get(RefreshAccessToken);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/get-user").get(verifyJWT, getCurrentUser);

router.route("/update-profile").put(verifyJWT, updateUserProfile);

router
  .route("/update-avatar")
  .patch(verifyJWT, upload.single("avatar"), updateAvatar);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

router.route("/history").get(verifyJWT, getWatchHistory);

export { router };
