import mongoose , {Schema} from "mongoose";

const RiderSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    number: {
        type: String,
        required: true
    },
    dob: {
        type: String,
    },
    termsAccepted: {
        type: Boolean,
        required: true
    }
},
{
    timestamps: true,
});

const Rider = mongoose.models.Rider || mongoose.model('Rider', RiderSchema);
export default Rider;
