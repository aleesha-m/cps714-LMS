import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
    loan_id: {
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
    loan_date: {
        type: Date,
        required: true
    },
    due_date: {
        type: Date,
        required: true
    },
    return_date: {
        type: Date,
        default: null
    }
});

const Loan = mongoose.model("Loan", loanSchema);

export default Loan;