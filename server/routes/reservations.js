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
        const allReservations = await Reservation.find({ status: "active" }).sort({ reserved_date: 1 });
        const reservations = req.user.role === "librarian"
            ? allReservations
            : allReservations.filter((reservation) => reservation.user_id === req.user.profile_id);
        const ISBNs = [...new Set(reservations.map((reservation) => reservation.ISBN))];
        const [books, activeLoans] = await Promise.all([
            Book.find({ ISBN: { $in: ISBNs } }).select("ISBN available").lean(),
            Loan.find({ ISBN: { $in: ISBNs }, return_date: null }).select("ISBN due_date").lean()
        ]);
        const booksByISBN = new Map(books.map((book) => [book.ISBN, book]));
        const loansByISBN = new Map(activeLoans.map((loan) => [loan.ISBN, loan]));
        const positions = new Map();
        for (const reservation of allReservations) {
            const position = (positions.get(reservation.ISBN) ?? 0) + 1;
            positions.set(reservation.ISBN, position);
            positions.set(reservation.reservation_id, position);
        }
        const now = new Date();
        const loanPeriodMs = 14 * 24 * 60 * 60 * 1000;

        res.json(reservations.map((reservation) => {
            const position = positions.get(reservation.reservation_id);

            const book = booksByISBN.get(reservation.ISBN);
            const activeLoan = loansByISBN.get(reservation.ISBN);
            const dueDate = activeLoan ? new Date(activeLoan.due_date) : null;
            const availableAt = book?.available && position === 1
                ? now
                : dueDate && dueDate > now
                    ? dueDate
                    : now;
            const estimatedReadyDate = new Date(availableAt.getTime() + Math.max(0, position - 1) * loanPeriodMs);

            return {
                ...reservation.toObject(),
                queue_position: position,
                estimated_ready_date: estimatedReadyDate
            };
        }));
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
