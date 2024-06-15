// lib/models/AvaliableDrivers.js
import mongoose, { models } from "mongoose";

const AvaliableDriverSchema = new mongoose.Schema({
  cell_id: {
    type: String,
    required: true,
    unique: true,
  },
  drivers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: [],
  }],
});

const AvaliableDriver = models.AvaliableDriver || mongoose.model("AvaliableDriver", AvaliableDriverSchema);

export default AvaliableDriver;
