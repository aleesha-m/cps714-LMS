import crypto from "crypto";
import express from "express";
import User from "../models/User.js";
import Member from "../models/Member.js";
import Librarian from "../models/Librarian.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../auth/password.js";
import { createSession, destroySession, requireAuth } from "../middleware/auth.js";

const router = express.Router();

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, profile_id: u.profile_id });

const safeEqual = (a, b) => {
    const x = crypto.createHash("sha256").update(String(a)).digest();
    const y = crypto.createHash("sha256").update(String(b)).digest();
    return crypto.timingSafeEqual(x, y);
};

// Very small in-memory login throttle: 5 failures per email locks it for 5 minutes.
const failures = new Map();
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

// Sign up. Anyone can create a member account. A librarian account needs the
// invite code set in server/.env as LIBRARIAN_CODE (if unset, librarian signup is off).
router.post("/signup", async (req, res) => {
    try {
        const name = String(req.body.name ?? "").trim();
        const email = String(req.body.email ?? "").trim().toLowerCase();
        const password = String(req.body.password ?? "");
        const phone = String(req.body.phone ?? "").trim();
        const role = req.body.role === "librarian" ? "librarian" : "member";

        if (!name || name.length > 100) return res.status(400).json({ message: "Please enter your name" });
        if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Please enter a valid email" });
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({ message: "Password must be 8-72 characters" });
        }
        if (role === "member" && !phone) return res.status(400).json({ message: "Please enter a phone number" });

        if (role === "librarian") {
            const code = process.env.LIBRARIAN_CODE;
            if (!code) return res.status(403).json({ message: "Librarian sign-up is disabled" });
            if (!safeEqual(req.body.code ?? "", code)) {
                return res.status(403).json({ message: "Invalid librarian invite code" });
            }
        }

        if (await User.findOne({ email })) {
            return res.status(409).json({ message: "That email is already registered" });
        }

        const profile_id = (role === "librarian" ? "S-" : "M-") + crypto.randomBytes(4).toString("hex").toUpperCase();
        const user = await User.create({
            name,
            email,
            passwordHash: await hashPassword(password),
            role,
            profile_id
        });

        // Create the matching Member / Librarian record so the rest of the app keeps working.
        try {
            if (role === "librarian") await Librarian.create({ staff_id: profile_id, name });
            else await Member.create({ user_id: profile_id, name, phone_num: phone, email });
        } catch (profileError) {
            await User.deleteOne({ _id: user._id });
            throw profileError;
        }

        await createSession(res, user._id);
        res.status(201).json(publicUser({ ...user.toObject(), id: user._id.toString() }));
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "That email is already registered" });
        res.status(500).json({ message: error.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body.email ?? "").trim().toLowerCase();
        const password = String(req.body.password ?? "");

        const record = failures.get(email);
        if (record && record.lockedUntil > Date.now()) {
            return res.status(429).json({ message: "Too many attempts. Try again in a few minutes." });
        }

        const user = await User.findOne({ email });
        const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);

        if (!user || !ok) {
            const count = (record?.count ?? 0) + 1;
            failures.set(email, { count, lockedUntil: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
            return res.status(401).json({ message: "Invalid email or password" });
        }

        failures.delete(email);
        await createSession(res, user._id);
        res.json(publicUser({ ...user.toObject(), id: user._id.toString() }));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post("/logout", async (req, res) => {
    try {
        await destroySession(req, res);
        res.json({ message: "Signed out" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Who am I? Used by the frontend on page load.
router.get("/me", requireAuth, (req, res) => res.json(req.user));

export default router;
