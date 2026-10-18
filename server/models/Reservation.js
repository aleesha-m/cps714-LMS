import mongoose from "mongoose";

// A member's place in the queue for a book that is checked out (or being held for
// someone ahead of them). Oldest active reservation is first in line.
//   active    -> still waiting / holding the book
//   fulfilled -> the member checked the book out
//   cancelled -> the member (or a librarian) cancelled it, or the book was deleted
const reservationSchema = new mongoose.Schema({
    reservation_id: {
        type: String,
        required: true,
        unique: true
    },
    user_id: {
        type: String,
        required: true
    },
    ISBN: {
        type: String,
        required: true
    },
    reserved_date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["active", "fulfilled", "cancelled"],
        default: "active"
    },
    resolved_date: {
        type: Date,
        default: null
    }
});

// A member can only have one active reservation per book.
reservationSchema.index(
    { user_id: 1, ISBN: 1 },
    { unique: true, partialFilterExpression: { status: "active" } }
);

const Reservation = mongoose.model("Reservation", reservationSchema);

export default Reservation;
