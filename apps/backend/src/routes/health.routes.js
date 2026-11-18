import { Router } from "express";
import { checkDatabaseConnection } from "../database/health.js";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "queralyth-backend",
    timestamp: new Date().toISOString()
  });
});

router.get("/health/database", async(req, res)=>{
  const result = await checkDatabaseConnection()

  const statusCode = result.status === "healthy" ? 200 : 503

  res.status(statusCode).json({
    service: "queralyth-database",
    ...result,
    timestamp: new Date().toISOString()
  })
})

export default router;