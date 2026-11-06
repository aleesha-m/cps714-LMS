import express from "express";
import Book from "../models/Book.js";
import Wishlist from "../models/Wishlist.js";
import { recordReadingActivity } from "./readingGoals.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("member"));

router.get("/", async (req, res) => {
    try {
        const wishlist = await Wishlist.find({ user_id: req.user.profile_id }).sort({ addedAt: -1 });
        res.json(wishlist);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const ISBN = String(req.body.ISBN ?? "").trim();
        if (!ISBN) return res.status(400).json({ message: "Please choose a book" });
        if (!(await Book.exists({ ISBN }))) return res.status(404).json({ message: "Book not found" });

        const item = await Wishlist.create({ user_id: req.user.profile_id, ISBN });
        res.status(201).json(item);
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "This book is already on your wishlist" });
        res.status(500).json({ message: error.message });
    }
});

router.patch("/:isbn", async (req, res) => {
    try {
        const { chaptersRead, totalChapters } = req.body;
        if (!Number.isInteger(totalChapters) || totalChapters < 1 || totalChapters > 10000) {
            return res.status(400).json({ message: "Total chapters must be between 1 and 10,000" });
        }
        if (!Number.isInteger(chaptersRead) || chaptersRead < 0 || chaptersRead > totalChapters) {
            return res.status(400).json({ message: "Chapters read must be between 0 and the total chapters" });
        }

        const previous = await Wishlist.findOne({ user_id: req.user.profile_id, ISBN: req.params.isbn });
        if (!previous) return res.status(404).json({ message: "Wishlist book not found" });

        const item = await Wishlist.findOneAndUpdate(
            { user_id: req.user.profile_id, ISBN: req.params.isbn },
            { chaptersRead, totalChapters },
            { new: true, runValidators: true }
        );
        if (!item) return res.status(404).json({ message: "Wishlist book not found" });
        await recordReadingActivity(
            req.user.profile_id,
            item.ISBN,
            chaptersRead === totalChapters,
            chaptersRead !== previous.chaptersRead
        );
        res.json(item);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete("/:isbn", async (req, res) => {
    try {
        const item = await Wishlist.findOneAndDelete({ user_id: req.user.profile_id, ISBN: req.params.isbn });
        if (!item) return res.status(404).json({ message: "Wishlist book not found" });
        res.json({ message: "Book removed from wishlist" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
