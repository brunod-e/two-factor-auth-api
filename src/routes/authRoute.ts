import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.post("/register", authController.RegisterRouteHandler);
router.post("/login", authController.LoginRouteHandler);
router.post("/login/verify", authController.OTPVerify);
router.post("/login/otp/enable", authController.OTPEnable);
router.post("/login/otp/disable", authController.OTPDisable);

export default router;
