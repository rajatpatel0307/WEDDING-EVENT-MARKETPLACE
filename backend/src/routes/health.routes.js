
import { Router } from "express";
import { poolPromise } from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(
            "SELECT DB_NAME() AS databaseName, 1 AS connected"
        );

        res.status(200).json({
            success: true,
            message: "Backend and database are working",
            data: {
                api: "running",
                database: "connected",
                databaseName: result.recordset[0].databaseName,
            },
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            success: false,
            message: "Database connection unavailable",
            data: {
                api: "running",
                database: "disconnected",
            },
        });
    }
});

export default router;
