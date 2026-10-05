import mongoose from "mongoose";

const librarianSchema = new mongoose.Schema({
    staff_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    }
});

const Librarian = mongoose.model("Librarian", librarianSchema);

export default Librarian;