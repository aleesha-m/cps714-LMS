import crypto from "crypto";
import express from "express";
import Book from "../models/Book.js";
import Loan from "../models/Loan.js";
import Reservation from "../models/Reservation.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Every reservation route needs a signed-in user.
router.use(requireAuth);

// Active reservations: librarians see everyone's, members only their own.
router.get("/", async (req, res) => {
    try {
        const filter = { status: "active" };
        if (req.user.role !== "librarian") filter.user_id = req.user.profile_id;
        const reservations = await Reservation.find(filter).sort({ reserved_date: 1 });
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reserve a book (members only).
// Reserving only makes sense when the book can't be borrowed right now: it is
// checked out, or it is being held for someone ahead in the queue.
router.post("/", requireRole("member"), async (req, res) => {
    try {
        const ISBN = String(req.body.ISBN ?? "");
        const user_id = req.user.profile_id;

        const book = await Book.findOne({ ISBN });
        if (!book) return res.status(404).json({ message: "Book not found" });

        if (await Loan.exists({ ISBN, user_id, return_date: null })) {
            return res.status(400).json({ message: "You already have this book checked out" });
        }

        const someoneWaiting = await Reservation.exists({ ISBN, status: "active" });
        if (book.available && !someoneWaiting) {
            return res.status(400).json({ message: "This book is available now. You can check it out instead." });
        }

        const reservation = await Reservation.create({
            reservation_id: crypto.randomUUID(),
            user_id,
            ISBN
        });

        res.status(201).json(reservation);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "You have already reserved this book" });
        }
        res.status(400).json({ message: error.message });
    }
});

// Cancel a reservation. Members can cancel their own; librarians can cancel any.
router.delete("/:reservation_id", async (req, res) => {
    try {
        const reservation = await Reservation.findOne({ reservation_id: req.params.reservation_id });
        if (!reservation) return res.status(404).json({ message: "Reservation not found" });

        if (req.user.role !== "librarian" && reservation.user_id !== req.user.profile_id) {
            return res.status(403).json({ message: "You can only cancel your own reservations" });
        }

        // Atomic: only succeeds if it's still active.
        const cancelled = await Reservation.findOneAndUpdate(
            { reservation_id: reservation.reservation_id, status: "active" },
            { status: "cancelled", resolved_date: new Date() },
            { new: true }
        );
        if (!cancelled) return res.status(400).json({ message: "This reservation is no longer active" });

        res.json({ message: "Reservation cancelled", reservation: cancelled });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
