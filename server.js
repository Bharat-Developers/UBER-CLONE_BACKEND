import express, { json } from 'express';
import cors from 'cors';
import { connect } from './config/db.js';
import dotenv from 'dotenv';
import rider_path from './routes/rider.js';
import driver_path from './routes/driver.js';
import cab_path from './routes/cab.js';
import availableDriver_path from './routes/avaliableDrivers.js'
import trip_path from './routes/trip.js';
//import mongoose from 'mongoose';
//configuring enivorment variable path
dotenv.config({path: '.env'});
const app = express()
app.use(json())
const PORT = process.env.PORT || 5001;
//const CONNECTION = process.env.MONGODB_URI;
app.use(cors(
    {
        //"origin": "http://localhost:3000/"
        "origin" : '*'
    }
))


app.use('/api/rider',rider_path);
app.use('/api/driver',driver_path);
app.use('/api/cab',cab_path);
app.use('api/availableDriver',availableDriver_path);
app.use('api/trip/',trip_path);

// connecting to mongodb and starting the server
const start = async () => {
    try {
        // await mongoose.connect(CONNECTION)
        connect();
        app.listen(PORT, () => {
            console.log("app listing for port " + PORT);
            console.log("server live at http://localhost:"+PORT)
        });
    } catch (error) {
        console.log(error.message);
    }

};

start();
