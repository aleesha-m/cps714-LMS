import crypto from "crypto";
import Session from "../models/Session.js";
import User from "../models/User.js";

export const COOKIE_NAME = "lms_session";
export const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function readCookie(req, name) {
    const header = req.headers.cookie || "";
    for (const part of header.split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name) return decodeURIComponent(rest.join("="));
    }
    return null;
}

export function cookieOptions() {
    return {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MS
    };
}

export async function createSession(res, userId) {
    const token = crypto.randomBytes(32).toString("base64url");
    await Session.create({
        tokenHash: sha256(token),
        user: userId,
        expiresAt: new Date(Date.now() + SESSION_MS)
    });
    res.cookie(COOKIE_NAME, token, cookieOptions());
}

export async function destroySession(req, res) {
    const token = readCookie(req, COOKIE_NAME);
    if (token) await Session.deleteOne({ tokenHash: sha256(token) });
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
}

// Attaches req.user ({ id, name, email, role, profile_id }) or responds 401.
export async function requireAuth(req, res, next) {
    try {
        const token = readCookie(req, COOKIE_NAME);
        if (!token) return res.status(401).json({ message: "Not signed in" });

        const session = await Session.findOne({
            tokenHash: sha256(token),
            expiresAt: { $gt: new Date() }
        });
        if (!session) return res.status(401).json({ message: "Session expired, please sign in again" });

        // Look the user up on every request so role changes apply immediately.
        const user = await User.findById(session.user);
        if (!user) return res.status(401).json({ message: "Account no longer exists" });

        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            profile_id: user.profile_id
        };
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// Use after requireAuth: requireRole("librarian")
export const requireRole = (...roles) => (req, res, next) =>
    roles.includes(req.user.role)
        ? next()
        : res.status(403).json({ message: "You don't have permission to do that" });
