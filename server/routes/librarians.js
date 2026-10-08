import express from "express";
import Librarian from "../models/Librarian.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get all librarians (librarians only)
router.get("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const librarians = await Librarian.find();
        res.json(librarians);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new librarian (librarians only)
router.post("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const librarian = new Librarian({
            staff_id: req.body.staff_id,
            name: req.body.name
        });

        const savedLibrarian = await librarian.save();

        res.status(201).json(savedLibrarian);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;