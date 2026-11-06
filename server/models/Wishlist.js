import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    ISBN: {
        type: String,
        required: true
    },
    chaptersRead: {
        type: Number,
        default: 0,
        min: 0
    },
    totalChapters: {
        type: Number,
        default: 0,
        min: 0
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

wishlistSchema.index({ user_id: 1, ISBN: 1 }, { unique: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
