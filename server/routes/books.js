import express from "express";
import Book from "../models/Book.js";

const router = express.Router();

// Get all books
router.get("/", async (req, res) => {
    try {
        const books = await Book.find();
        res.json(books);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new book
router.post("/", async (req, res) => {
    try {
        const book = new Book({
            ISBN: req.body.ISBN,
            author: req.body.author,
            title: req.body.title,
            genre: req.body.genre,
            cover: req.body.cover
        });

        const savedBook = await book.save();

        res.status(201).json(savedBook);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
