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
        type: [Number,Number], 
        required: true,
    },
    destination : {
        type: [Number,Number], 
        required : true,
    },
    amount : {
        type : String,
        required : true,
    }
},
{
    timestamps: true
});

const Trip = mongoose.model('Trip', TripSchema);

export default Trip;