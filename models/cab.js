import { ObjectId } from "mongodb";
import mongoose, { Schema } from "mongoose";

const CabSchema = new Schema({
    
        driverId: {
            type: ObjectId,
            required: true,
            //unique: true,
        },
        vehicleModel: { // car model name
            type: String,
            required: true
        },
        rCNo: {
            type: String,
            required: true
        }

    })

    const Cab = mongoose.model('Cab',CabSchema)

    export default Cab;