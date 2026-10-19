import crypto from "crypto";
import express from "express";
import Member from "../models/Member.js";
import Librarian from "../models/Librarian.js";
import User from "../models/User.js";
import { hashPassword } from "../auth/password.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Get all members (librarians only)
router.get("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const [users, members, librarians] = await Promise.all([
            User.find().select("name email role profile_id").lean(),
            Member.find().lean(),
            Librarian.find().lean()
        ]);
        const memberProfiles = new Map(members.map((member) => [member.user_id, member]));
        const userProfileIds = new Set(users.map((user) => user.profile_id));
        const accounts = users.map((user) => {
            const profile = memberProfiles.get(user.profile_id);
            return {
                user_id: user.profile_id,
                name: user.name,
                email: user.email,
                phone_num: profile?.phone_num ?? "",
                role: user.role
            };
        });
        const legacyMembers = members
            .filter((member) => !userProfileIds.has(member.user_id))
            .map((member) => ({ ...member, role: "member" }));
        const legacyLibrarians = librarians
            .filter((librarian) => !userProfileIds.has(librarian.staff_id))
            .map((librarian) => ({
                user_id: librarian.staff_id,
                name: librarian.name,
                email: "",
                phone_num: "",
                role: "librarian"
            }));

        res.json([...accounts, ...legacyMembers, ...legacyLibrarians].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new member (librarians only)
router.post("/", requireAuth, requireRole("librarian"), async (req, res) => {
    try {
        const name = String(req.body.name ?? "").trim();
        const email = String(req.body.email ?? "").trim().toLowerCase();
        const phone_num = String(req.body.phone_num ?? "").trim();
        const password = String(req.body.password ?? "");
        const role = req.body.role;

        if (!name || name.length > 100) return res.status(400).json({ message: "Please enter the member's name" });
        if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email" });
        if (role !== "member" && role !== "librarian") return res.status(400).json({ message: "Choose a valid account type" });
        if (role === "member" && !phone_num) return res.status(400).json({ message: "Please enter a phone number" });
        if (phone_num.length > 40) return res.status(400).json({ message: "Please enter a valid phone number" });
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ message: "Password must be 8-72 characters" });
        }
        if (await Member.exists({ email }) || await User.exists({ email })) {
            return res.status(409).json({ message: "An account or member record already uses this email" });
        }

        const profile_id = `${role === "librarian" ? "S" : "M"}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const user = await User.create({
            name,
            email,
            passwordHash: await hashPassword(password),
            role,
            profile_id
        });

        try {
            if (role === "member") await Member.create({ user_id: profile_id, name, phone_num, email });
            else await Librarian.create({ staff_id: profile_id, name });
        } catch (profileError) {
            await User.deleteOne({ _id: user._id });
            throw profileError;
        }

        res.status(201).json({ user_id: profile_id, name, email, phone_num, role });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "An account or member record already exists" });
        res.status(400).json({ message: error.message });
    }
});

export default router;