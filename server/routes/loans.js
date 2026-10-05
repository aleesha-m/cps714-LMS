import express from "express";
import Loan from "../models/Loan.js";
import Book from "../models/Book.js";

const router = express.Router();

// Get all loans
router.get("/", async (req, res) => {
    try {
        const loans = await Loan.find();
        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Check out a book
router.post("/", async (req, res) => {
    try {
        const { loan_id, user_id, ISBN, due_date } = req.body;

        // Find the book
        const book = await Book.findOne({ ISBN });

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        // Make sure the book is available
        if (!book.available) {
            return res.status(400).json({
                message: "Book is already checked out"
            });
        }

        // Create the loan
        const loan = new Loan({
            loan_id,
            user_id,
            ISBN,
            loan_date: new Date(),
            due_date,
            return_date: null
        });

        const savedLoan = await loan.save();

        // Mark the book as unavailable
        book.available = false;
        await book.save();

        res.status(201).json(savedLoan);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
});

// Return a book
router.put("/:loan_id/return", async (req, res) => {
    try {
        const { loan_id } = req.params;

        // Find the loan
        const loan = await Loan.findOne({ loan_id });

        if (!loan) {
            return res.status(404).json({
                message: "Loan not found"
            });
        }

        // Make sure the book hasn't already been returned
        if (loan.return_date !== null) {
            return res.status(400).json({
                message: "Book has already been returned"
            });
        }

        // Record return date
        loan.return_date = new Date();
        await loan.save();

        // Make the book available again
        const book = await Book.findOne({ ISBN: loan.ISBN });

        if (book) {
            book.available = true;
            await book.save();
        }

        res.json({
            message: "Book returned successfully",
            loan: loan
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

export default router;