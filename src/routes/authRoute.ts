import express from "express";
import authController from "../controllers/authController";

const router = express.Router();

router.post("/register", authController.RegisterRouteHandler);
router.post("/login", authController.LoginRouteHandler);
router.post("/login/verify", authController.OTPVerify);

export default router;
