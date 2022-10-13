import { PrismaClient } from "@prisma/client";
import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./src/routes/authRoute";

// Instancia o Prisma Client e o Express
export const prisma = new PrismaClient();
const app = express();

async function main() {
  // Essa configuração serve para o Express fornecer logs no terminal sobre as requisições HTTP
  app.use(morgan("dev"));

  // Essa configuração vai evitar o erro chato de cors, permitindo que o servidor aceite requisições cross-origin
  app.use(
    cors({
      origin: ["http://localhost:3000"],
      credentials: true,
    })
  );

  // Essa configuração vai fazer o parse do paytload das requisições para JSON
  app.use(express.json());

  // DEBUG FUNCTION - Apenas para verificar o funcionamento do servidor
  app.get("/api/healthchecker", (req: Request, res: Response) => {
    res.status(200).json({
      status: "success",
      message: "Bem vindo ao servidor do trabalho de Segurança de Redes",
    });
  });

  // Adiciona as rotas de autenticação na API
  app.use("/api/auth", authRoutes);

  app.all("*", (req: Request, res: Response) => {
    return res.status(404).json({
      status: "fail",
      message: `Route: ${req.originalUrl} not found`,
    });
  });

  //  Porta do servidor
  const PORT = 8000;
  app.listen(PORT, () => {
    console.info(`SERVIDOR RODANDO NA PORTA: ${PORT}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
