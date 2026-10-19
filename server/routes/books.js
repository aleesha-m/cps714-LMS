import express from "express";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";
import Reservation from "../models/Reservation.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const clean = (value) => String(value ?? "").trim();

// Covers are image links. Only allow http(s) URLs (or nothing).
const validCover = (cover) => cover === "" || /^https?:\/\/\S+$/i.test(cover);

// Get all books (any signed-in user).
// Each book also says how many people are queued for it and, for the signed-in
// member, their own place in that queue (1 = first in line), without revealing who else is queued.
router.get("/", requireAuth, async (req, res) => {
    try {
        const [books, reservations] = await Promise.all([
            Book.find().lean(),
            Reservation.find({ status: "active" }).sort({ reserved_date: 1 }).lean()
        ]);

        const queues = new Map();
        for (const reservation of reservations) {
            if (!queues.has(reservation.ISBN)) queues.set(reservation.ISBN, []);
            queues.get(reservation.ISBN).push(reservation.user_id);
        }

        res.json(books.map((book) => {
            const queue = queues.get(book.ISBN) ?? [];
            const position = queue.indexOf(req.user.profile_id);
            return {
                ...book,
                queueLength: queue.length,
                myPosition: position === -1 ? null : position + 1
            };
        }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new book (librarians only)
router.post("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const cover = clean(req.body.cover);
        if (!validCover(cover)) {
            return res.status(400).json({ message: "Cover must be a web link starting with http:// or https://" });
        }

        const book = new Book({
            ISBN: clean(req.body.ISBN),
            author: clean(req.body.author),
            title: clean(req.body.title),
            genre: clean(req.body.genre),
            cover,
            description: clean(req.body.description)
        });

        const savedBook = await book.save();

        res.status(201).json(savedBook);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "A book with that ISBN already exists" });
        }
        res.status(400).json({ message: error.message });
    }
});

// Edit a book (librarians only). The ISBN is the book's identity (loans and
// reservations point at it), so it can't be changed.
router.put("/:isbn", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const updates = {};
        for (const field of ["title", "author", "genre", "cover", "description"]) {
            if (req.body[field] !== undefined) updates[field] = clean(req.body[field]);
        }
        for (const field of ["title", "author", "genre"]) {
            if (field in updates && !updates[field]) {
                return res.status(400).json({ message: `Please enter a ${field}` });
            }
        }
        if ("cover" in updates && !validCover(updates.cover)) {
            return res.status(400).json({ message: "Cover must be a web link starting with http:// or https://" });
        }

        const book = await Book.findOneAndUpdate(
            { ISBN: req.params.isbn },
            updates,
            { new: true, runValidators: true }
        );
        if (!book) return res.status(404).json({ message: "Book not found" });

        res.json(book);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a book (librarians only). Refused while the book is checked out.
router.delete("/:isbn", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const { isbn } = req.params;

        if (await Loan.exists({ ISBN: isbn, return_date: null })) {
            return res.status(400).json({ message: "This book is checked out. Check it in before deleting it." });
        }

        const book = await Book.findOneAndDelete({ ISBN: isbn });
        if (!book) return res.status(404).json({ message: "Book not found" });

        // Nobody can wait for a book that no longer exists.
        await Reservation.updateMany(
            { ISBN: isbn, status: "active" },
            { status: "cancelled", resolved_date: new Date() }
        );

        res.json({ message: "Book deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
