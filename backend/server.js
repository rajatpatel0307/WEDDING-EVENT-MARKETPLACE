
import "dotenv/config";
import app from "./src/app.js";
import { poolPromise } from "./src/config/db.js";

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
    try {
        // Verify database connection before starting the server
        await poolPromise;

        const server = app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

        server.on("error", (error) => {
            console.error("HTTP server error:", error.message);
            process.exitCode = 1;
        });
    } catch (error) {
        console.error("Backend startup failed:", error.message);
        process.exitCode = 1;
    }
}

startServer();
