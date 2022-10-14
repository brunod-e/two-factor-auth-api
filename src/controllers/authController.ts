import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../../server";
import speakeasy from "speakeasy";
import util from "util";
import { User } from "@prisma/client";
import { encrypt, decrypt } from "../utils/crypto";

const encryptPassword = (password: string, salt: string) => {
  const key = crypto.pbkdf2Sync(password, salt, 100, 32, "sha256");
  const valueIV = encrypt(password, key);
  return valueIV.toString("hex");
};

const decryptPassword = (valueIVHex: string, password: string, salt) => {
  const valueIV = Buffer.from(valueIVHex, "hex");
  const key = crypto.pbkdf2Sync(password, salt, 100, 32, "sha256");
  return decrypt(valueIV, key).toString("utf8");
};

const RegisterRouteHandler = async (req: Request, res: Response) => {
  try {
    const scrypt = util.promisify(crypto.scrypt);

    const { email, password } = req.body;

    const secret = speakeasy.generateSecret().hex;

    const salt = crypto.randomBytes(32).toString("hex");
    const encrypted_email = await scrypt(email, salt, 2048);
    const encrypted_password = encryptPassword(password, salt);

    await prisma.user.create({
      data: {
        //@ts-ignore
        email: encrypted_email.toString("hex"),
        //@ts-ignore
        password: encrypted_password.toString("hex"),
        salt,
        secret,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Registered successfully, please login",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const LoginRouteHandler = async (req: Request, res: Response) => {
  try {
    const scrypt = util.promisify(crypto.scrypt);

    const { email, password } = req.body;

    const user: User = (await prisma.user.findMany()).filter(async (user) => {
      const encrypted_email = await scrypt(email, user.salt, 2048);

      // @ts-ignore
      return user.email === encrypted_email.toString("hex");
    })[0];

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Login error, please check your credentials",
      });
    }

    const decryptedPassword = decryptPassword(
      user.password,
      password,
      user.salt
    );

    const generatedToken = speakeasy.totp({
      secret: user.secret,
      encoding: "hex",
      step: 60,
      algorithm: "sha256",
    });

    if (decryptedPassword !== password) {
      return res.status(404).json({
        status: "fail",
        message: "Login error, password is invalid",
      });
    } else {
      res.status(200).json({
        status: "success",
        generatedToken,
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const OTPVerify = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { user_id, token } = req.body;

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    // Retorna erro caso o usuário não exista
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Verifica se o token informado é válido
    const isValidToken = speakeasy.totp.verify({
      secret: user.secret,
      algorithm: "sha256",
      encoding: "hex",
      token: token,
      step: 60,
    });

    // Retorna um erro caso o token não seja válido
    if (!isValidToken) {
      return res.status(401).json({
        status: "fail",
        message: "Token is invalid",
      });
    }

    // Informa que o token ja foi verificado
    await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_verified: true,
      },
    });

    // Usuario ja pode logar normalmente
    res.status(200).json({
      status: "success",
      message: "Token is valid, you are logged in",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export default {
  RegisterRouteHandler,
  LoginRouteHandler,
  OTPVerify,
};
