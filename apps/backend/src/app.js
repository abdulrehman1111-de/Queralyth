import express from "express";
import healthRoutes from "./routes/health.routes.js";
import errorHandler from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());

app.use("/api/v1", healthRoutes);

app.use((req, res)=>{
    res.status(404).json({
        status: "error",
        message: "Route not found"
    })
})

app.use(errorHandler);

export default app;
