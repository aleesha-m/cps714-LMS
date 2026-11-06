import express from "express";
import ReadingGoal from "../models/ReadingGoal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth, requireRole("member"));

function currentYearGoal(record, year) {
    return record.yearlyGoals.find((goal) => goal.year === year);
}

function responseFor(record, year) {
    const goal = currentYearGoal(record, year);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const currentStreak = record.lastActivityDate === today || record.lastActivityDate === yesterday
        ? record.currentStreak
        : 0;

    return {
        year,
        targetBooks: goal?.targetBooks ?? 12,
        booksCompleted: goal?.completedISBNs.length ?? 0,
        currentStreak
    };
}

async function getOrCreateRecord(userId) {
    return ReadingGoal.findOneAndUpdate(
        { user_id: userId },
        { $setOnInsert: { user_id: userId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
}

router.get("/", async (req, res) => {
    try {
        const year = new Date().getUTCFullYear();
        const record = await getOrCreateRecord(req.user.profile_id);
        let goal = currentYearGoal(record, year);
        if (!goal) {
            record.yearlyGoals.push({ year, targetBooks: 12, completedISBNs: [] });
            await record.save();
            goal = currentYearGoal(record, year);
        }
        res.json(responseFor(record, year));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put("/", async (req, res) => {
    try {
        const targetBooks = req.body.targetBooks;
        if (!Number.isInteger(targetBooks) || targetBooks < 1 || targetBooks > 1000) {
            return res.status(400).json({ message: "Reading goal must be between 1 and 1,000 books" });
        }

        const year = new Date().getUTCFullYear();
        const record = await getOrCreateRecord(req.user.profile_id);
        let goal = currentYearGoal(record, year);
        if (!goal) {
            record.yearlyGoals.push({ year, targetBooks, completedISBNs: [] });
        } else {
            goal.targetBooks = targetBooks;
        }
        await record.save();
        res.json(responseFor(record, year));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export async function recordReadingActivity(userId, ISBN, completed, activityLogged) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const year = new Date().getUTCFullYear();
    const record = await getOrCreateRecord(userId);

    if (activityLogged && record.lastActivityDate !== today) {
        record.currentStreak = record.lastActivityDate === yesterday ? record.currentStreak + 1 : 1;
        record.lastActivityDate = today;
    }

    let goal = currentYearGoal(record, year);
    if (!goal) {
        record.yearlyGoals.push({ year, targetBooks: 12, completedISBNs: [] });
        goal = currentYearGoal(record, year);
    }
    if (completed && !goal.completedISBNs.includes(ISBN)) {
        goal.completedISBNs.push(ISBN);
    }
    await record.save();
}

export default router;
