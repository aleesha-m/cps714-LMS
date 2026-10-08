import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js";
import authRouter from "./routes/auth.js";
import booksRouter from "./routes/books.js";
import librariansRouter from "./routes/librarians.js";
import membersRouter from "./routes/members.js";
import loansRouter from "./routes/loans.js";

dotenv.config();

connectDB();

const app = express();

// The Vite dev server proxies /api to this server (see vite.config.ts), so the
// session cookie is same-origin. CORS is only needed if you call the API directly.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);
app.use("/api/librarians", librariansRouter);
app.use("/api/members", membersRouter);
app.use("/api/loans", loansRouter);

app.get("/", (req, res) => {
    res.send("Library Management System API is running");
});

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
