import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phone_num: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    }
});

const Member = mongoose.model("Member", memberSchema);

export default Member;