import express from "express";
import Member from "../models/Member.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get all members (librarians only)
router.get("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const members = await Member.find();
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new member (librarians only)
router.post("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const member = new Member({
            user_id: req.body.user_id,
            name: req.body.name,
            phone_num: req.body.phone_num,
            email: req.body.email
        });

        const savedMember = await member.save();

        res.status(201).json(savedMember);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default router;