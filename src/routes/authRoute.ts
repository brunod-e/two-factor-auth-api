import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.post("/register", authController.RegisterRouteHandler);
router.post("/login", authController.LoginRouteHandler);
router.post("/otp/generate", authController.OTPHandler);
router.post("/otp/enable", authController.OTPEnabler);
router.post("/otp/validate", authController.OTPValidator);
router.post("/otp/disable", authController.OTPDisabler);

export default router;
