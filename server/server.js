import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js";
import booksRouter from "./routes/books.js";
import librariansRouter from "./routes/librarians.js";
import membersRouter from "./routes/members.js";
import loansRouter from "./routes/loans.js";

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/books", booksRouter);
app.use("/api/librarians", librariansRouter);
app.use("/api/members", membersRouter);
app.use("/api/loans", loansRouter);

app.get("/", (req, res) => {
    res.send("Library Management System API is running");
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});