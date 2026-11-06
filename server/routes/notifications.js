import express from "express";
import Notification from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("member"));

router.get("/", async (req, res) => {
    try {
        const notifications = await Notification.find({ user_id: req.user.profile_id })
            .sort({ createdAt: -1 })
            .limit(30)
            .lean();
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/:id/read", async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user.profile_id, readAt: null },
            { readAt: new Date() },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: "Notification not found" });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
