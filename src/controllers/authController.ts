import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../../server";
import speakeasy from "speakeasy";
import util from "util";
import { User } from "@prisma/client";
import { encrypt, decrypt } from "../utils/crypto";

const encryptPassword = (password: string, salt: string, email: string) => {
  const key = crypto.pbkdf2Sync(password, salt, 100, 32, "sha256");
  const IV = crypto.pbkdf2Sync(email, salt, 100, 32, "sha256");
  const value = encrypt(password, key, IV);
  return value.toString("hex");
};

const decryptPassword = (
  valueHex: string,
  password: string,
  salt: string,
  email: string
) => {
  const value = Buffer.from(valueHex, "hex");
  const key = crypto.pbkdf2Sync(password, salt, 100, 32, "sha256");
  const IV = crypto.pbkdf2Sync(email, salt, 100, 32, "sha256");
  return decrypt(value, key, IV).toString("utf8");
};

const RegisterRouteHandler = async (req: Request, res: Response) => {
  try {
    const scrypt = util.promisify(crypto.scrypt);

    const { email, password } = req.body;

    const salt = crypto.randomBytes(32).toString("hex");
    const secret = encrypt(
      crypto.randomBytes(128).toString("hex"),
      crypto.pbkdf2Sync(password, salt, 100, 32, "sha256"),
      crypto.randomBytes(32).toString("hex")
    ).toString("hex");

    // @ts-ignore
    const encrypted_email = (await scrypt(email, salt, 2048)).toString("hex");

    const encrypted_password = encryptPassword(password, salt, encrypted_email);

    await prisma.user.create({
      data: {
        //@ts-ignore
        email: encrypted_email,
        //@ts-ignore
        password: encrypted_password.toString("base64"),
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
      user.salt,
      user.email
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
        message: "Login error, please check your credentials",
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
