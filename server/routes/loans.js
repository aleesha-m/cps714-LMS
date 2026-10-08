import crypto from "crypto";
import express from "express";
import Loan from "../models/Loan.js";
import Book from "../models/Book.js";
import Member from "../models/Member.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const LOAN_DAYS = 14;

// Every loan route needs a signed-in user.
router.use(requireAuth);

// Get loans: librarians see all of them, members only see their own.
router.get("/", async (req, res) => {
    try {
        const filter = req.user.role === "librarian" ? {} : { user_id: req.user.profile_id };
        const loans = await Loan.find(filter);
        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Check out a book.
// Members always check out for themselves. Librarians may pass user_id to check
// a book out for a member (and may set a custom due_date).
router.post("/", async (req, res) => {
    let reservedBook = null;
    try {
        const isLibrarian = req.user.role === "librarian";
        const ISBN = String(req.body.ISBN ?? "");

        let user_id = req.user.profile_id;
        if (isLibrarian && req.body.user_id) {
            user_id = String(req.body.user_id);
            if (!(await Member.exists({ user_id }))) {
                return res.status(404).json({ message: "Member not found" });
            }
        }

        let due_date = new Date(Date.now() + LOAN_DAYS * 24 * 60 * 60 * 1000);
        if (isLibrarian && req.body.due_date) {
            const custom = new Date(req.body.due_date);
            if (Number.isNaN(custom.getTime())) {
                return res.status(400).json({ message: "Invalid due date" });
            }
            due_date = custom;
        }

        // Atomically claim the book so two people can't check out the same copy.
        reservedBook = await Book.findOneAndUpdate(
            { ISBN, available: true },
            { available: false }
        );

        if (!reservedBook) {
            const exists = await Book.exists({ ISBN });
            return exists
                ? res.status(400).json({ message: "Book is already checked out" })
                : res.status(404).json({ message: "Book not found" });
        }

        const loan = await Loan.create({
            loan_id: crypto.randomUUID(),
            user_id,
            ISBN,
            loan_date: new Date(),
            due_date,
            return_date: null
        });

        res.status(201).json(loan);
    } catch (error) {
        // Put the book back if we claimed it but failed to record the loan.
        if (reservedBook) await Book.updateOne({ _id: reservedBook._id }, { available: true });
        res.status(400).json({ message: error.message });
    }
});

// Return a book. Members can only return their own loans; librarians can return any.
router.put("/:loan_id/return", async (req, res) => {
    try {
        const { loan_id } = req.params;

        const existing = await Loan.findOne({ loan_id });
        if (!existing) {
            return res.status(404).json({ message: "Loan not found" });
        }

        if (req.user.role !== "librarian" && existing.user_id !== req.user.profile_id) {
            return res.status(403).json({ message: "You can only return your own loans" });
        }

        // Atomic: only succeeds if the loan hasn't been returned yet.
        const loan = await Loan.findOneAndUpdate(
            { loan_id, return_date: null },
            { return_date: new Date() },
            { new: true }
        );

        if (!loan) {
            return res.status(400).json({ message: "Book has already been returned" });
        }

        await Book.updateOne({ ISBN: loan.ISBN }, { available: true });

        res.json({
            message: "Book returned successfully",
            loan: loan
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
