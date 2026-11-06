import mongoose from "mongoose";

const yearlyGoalSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true
    },
    targetBooks: {
        type: Number,
        default: 12,
        min: 1,
        max: 1000
    },
    completedISBNs: {
        type: [String],
        default: []
    }
}, { _id: false });

const readingGoalSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    yearlyGoals: {
        type: [yearlyGoalSchema],
        default: []
    },
    currentStreak: {
        type: Number,
        default: 0,
        min: 0
    },
    lastActivityDate: {
        type: String,
        default: ""
    }
});

const ReadingGoal = mongoose.model("ReadingGoal", readingGoalSchema);

export default ReadingGoal;
