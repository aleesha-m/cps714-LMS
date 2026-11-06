import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    ISBN: {
        type: String,
        required: true
    },
    loan_id: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    readAt: {
        type: Date,
        default: null
    }
});

notificationSchema.index({ user_id: 1, loan_id: 1 }, { unique: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
