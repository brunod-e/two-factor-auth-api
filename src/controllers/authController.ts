import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../server";
import speakeasy from "speakeasy";
import bcrypt from "bcrypt";

//  Routes handlers

const RegisterRouteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Coleta as informações do payload
    const { name, email, password } = req.body; // Cria o usuário no banco de dados com o hash da senha

    // Cria o usuário no banco de dados com o hash da senha
    bcrypt.hash(password, 16, async (err, hash) => {
      await prisma.user.create({
        data: {
          name,
          email,
          password: hash,
        },
      });
    });

    // Retorna uma mensagem de sucesso para o usuário
    res.status(201).json({
      status: "success",
      message: "Registered successfully, please login",
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Verifica se o erro é um erro de duplicação de chave
    if (error instanceof PrismaClient.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({
          status: "fail",
          message: "Email already exist, please use another email address",
        });
      }
    }

    // Retorna um erro genérico caso não seja um erro de duplicação de chave
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const LoginRouteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    bcrypt.compare(password, user.password, (err, isCorrectPassword) => {
      if (isCorrectPassword) {
        // Retorna um sucesso para o usuário com o token de acesso
        res.status(200).json({
          status: "success",
          token: "token",
        });
      } else {
        // Retorna um erro caso a senha não seja válida
        res.status(401).json({
          status: "fail",
          message: "Login error, please check your credentials",
        });
      }
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Retorna um erro genérico
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const OTPHandler = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { user_id } = req.body;

    // Retorna um objeto com as secret keys em alguns formatos
    const { ascii, hex, base32, otpauth_url } = speakeasy.generateSecret({
      issuer: "codevoweb.com",
      name: "admin@admin.com",
      length: 15,
    });

    // Armazena as secret keys no banco de dados
    await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_ascii: ascii,
        otp_auth_url: otpauth_url,
        otp_base32: base32,
        otp_hex: hex,
      },
    });

    // Retorna um sucesso para o usuário com a URL para configurar o OTP
    res.status(200).json({
      base32,
      otpauth_url,
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Retorna um erro genérico
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const OTPEnabler = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { user_id, token } = req.body;

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    const message = "Token is invalid or user doesn't exist";

    // Retorna erro caso o usuário não exista
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    // Verifica se o token informado é válido
    const verified = speakeasy.totp.verify({
      secret: user.otp_base32!,
      encoding: "base32",
      token,
    });

    // Retorna um erro caso o token não seja válido
    if (!verified) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    // Atualiza o usuário no banco de dados para informar que o OTP está ativado
    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: true,
        otp_verified: true,
      },
    });

    // Retorna um sucesso para o usuário com alguns dados
    res.status(200).json({
      otp_verified: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        otp_enabled: updatedUser.otp_enabled,
      },
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Retorna um erro genérico
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const OTPDisabler = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { user_id } = req.body;

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    // Retorna erro caso o usuário não exista
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "User doesn't exist",
      });
    }

    //   Atualiza o usuário no banco de dados para informar que o OTP está desativado
    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: {
        otp_enabled: false,
      },
    });

    // Retorna um sucesso para o usuário com alguns dados
    res.status(200).json({
      otp_disabled: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        otp_enabled: updatedUser.otp_enabled,
      },
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Retorna um erro genérico
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const OTPValidator = async (req: Request, res: Response) => {
  try {
    // Coleta as informações do payload
    const { user_id, token } = req.body;

    // Busca o usuário no banco de dados
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    const message = "Token is invalid or user doesn't exist";

    // Retorna erro caso o usuário não exista
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    // Verifica se o token informado é válido
    const validToken = speakeasy.totp.verify({
      secret: user?.otp_base32!,
      encoding: "base32",
      token,
      window: 1,
    });

    // Retorna um erro caso o token não seja válido
    if (!validToken) {
      return res.status(401).json({
        status: "fail",
        message,
      });
    }

    // Retorna um sucesso para o usuário com a informação de que o token é válido
    res.status(200).json({
      otp_valid: true,
    });

    // Catch para informar caso ocorra algum erro
  } catch (error) {
    // Retorna um erro genérico
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export default {
  RegisterRouteHandler,
  LoginRouteHandler,
  OTPHandler,
  OTPEnabler,
  OTPValidator,
  OTPDisabler,
};
