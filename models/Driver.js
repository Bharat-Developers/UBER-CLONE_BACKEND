import { ObjectId } from 'mongodb';
import mongoose,{Schema} from 'mongoose';
const DriverSchema = new Schema({
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
        type: Number,
        required: true,
        unique: true
    },
    location: {
        type: String,
        required:true
    },
    language: {
        type: String,
        required: true
    },
    aadhar: {
        type: Number,
        require: true
    },
    dob: {
        type: String,
        required: true
    },
    termsAccepted: {
        type: Boolean,
        required: true
    },
    latLon: {
        type: [Number,Number],
    },
    availablity: {
        type: Boolean,
        default: false,
        required: true
    },
    cabId: {
        type: ObjectId,
        required: true   
    },
    cabType: {
        type: String,
    }
},
{
    timestamps: true,
});

const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
export default Driver;


