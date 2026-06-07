import express from "express";
import cors from "cors";
import "dotenv/config";
import routes from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Crucial for local dev frontend connection
app.use(express.json()); // Parses incoming JSON payloads

// Mount Routes
app.use("/api/v1", routes);

// Health Check Route
app.get("/health", (_req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});