import mongoose, { Schema } from "mongoose";
const TripSchema = new Schema({
    customerId: {
        type: Schema.Types.ObjectId,
        ref : 'Customer',
        required : true,
    },
    driverId: {
        type: Schema.Types.ObjectId,
        ref : 'Driver',
        required : true,
    },
    status: {
        type: String, 
        required: true,
        default: 0,       
    },
    source: {
        type: String, 
        required: true,
    },
    destination : {
        type: String, 
        required : true,
    },
    amount : {
        type : String,
        required : true,
    },
    otp: {
        type: Number,
        required : true
    }
},
{
    timestamps: true
});

const Trip = mongoose.model('Trip', TripSchema);

export default Trip;