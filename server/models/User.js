import mongoose from "mongoose";

// Login account. Each user also has a profile document:
//   member    -> Member    (profile_id = Member.user_id)
//   librarian -> Librarian (profile_id = Librarian.staff_id)
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["member", "librarian"],
        default: "member",
        required: true
    },
    profile_id: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model("User", userSchema);

export default User;
