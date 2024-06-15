import mongoose, { Schema } from "mongoose";

const PaymentSchema = new Schema({
    paymentId : {
        type : String,
    },
    tripId: {
        type: Schema.Types.ObjectId,
        ref : 'Trip',
        required: true,
    },
    method: {
        type: String, // UPI || cash || online payment
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    status: {
        type: String, // cancelled || completed || pending
        required: true,
    }
})

const Payment = mongoose.model('Payment',PaymentSchema);
export default  Payment;