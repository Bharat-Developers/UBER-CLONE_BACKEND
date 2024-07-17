import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

export const connect = async () => {
    const connectionState = mongoose.connection.readyState;

    if (connectionState === 1) {
        console.log('Already Connected to Database');
        return;
    }
    if (connectionState === 2) {
        console.log('Connecting...');
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'uber_clone2',
        },{ useNewUrlParser: true });
        console.log('Connected to Database');

        
        mongoose.connection.on('error', (err) => {
            console.log(`Mongoose connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose disconnected from DB');
        });
    }
    catch (error) {
        console.error('Error occurred while connecting to Database', error);
        //throw new Error('Error occurred while connecting to Database');
    }
}