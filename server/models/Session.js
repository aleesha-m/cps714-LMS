import mongoose from "mongoose";

// Server-side login sessions. Only a SHA-256 hash of the token is stored, and
// MongoDB deletes expired sessions automatically (TTL index on expiresAt).
const sessionSchema = new mongoose.Schema({
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
});

const Session = mongoose.model("Session", sessionSchema);

export default Session;
