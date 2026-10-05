import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    ISBN: {
        type: String,
        required: true,
        unique: true
    },
    author: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: true
    },
    available: {
        type: Boolean,
        default: true
    }
});

const Book = mongoose.model("Book", bookSchema);

export default Book;