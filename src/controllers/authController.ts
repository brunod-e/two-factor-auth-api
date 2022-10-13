import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../../server";
import speakeasy from "speakeasy";

const RegisterRouteHandler = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { email, password } = req.body;

    // Gera um salt para a senha e o secret para o futuro token
    const salt = crypto.randomBytes(16).toString("hex");
    const secret = speakeasy.generateSecret().hex;

    // Cria o usuário no banco de dados com o hash da senha
    crypto.pbkdf2(password, salt, 872791, 32, "sha512", async (err, hash) => {
      await prisma.user.create({
        data: {
          email,
          password: hash.toString("hex"),
          salt,
          secret,
        },
      });
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
    // Coleta as informações do payload
    const { email, password } = req.body;

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({ where: { email } });

    // Verifica se o usuário existe
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "Login error, please check your credentials",
      });
    }

    // Compara a senha informada com a senha do banco de dados
    crypto.pbkdf2(
      password,
      user.salt,
      872791,
      32,
      "sha512",
      async (err, hash) => {
        // Gera o token para a 2FA
        const generatedToken = speakeasy.totp({
          secret: user.secret,
          encoding: "hex",
          step: 60,
          algorithm: "sha256",
        });

        // Retorna um erro caso a senha não seja válida
        if (user.password !== hash.toString("hex")) {
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
      }
    );
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
