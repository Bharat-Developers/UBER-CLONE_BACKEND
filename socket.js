import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import verifyDriver from './middlewares/verifyDriverToken.js';
import verifyRider from './middlewares/verifyRiderToken.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { connect } from './config/db.js';
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
dotenv.config()

var count = 0;
const connectionsRider = {}
const connectionsDriver = {}
const riderNameSpace = io.of('/rider')
const driverNameSpace = io.of('/driver')
// middleware function 
io.use(async (socket, next) => {
    try {
        // token and usertype are passed as auth in io function at frontend
        const token = socket.handshake.auth.token;
        const userType = socket.handshake.auth.user;

        // depending on user , the token is verified and _id is decoded , socket is added to connections list as {id : socket} pair 
        if (userType === 'driver') {
            const driver_id = await verifyDriver(token);
            console.log(driver_id)
            if (driver_id in connectionsDriver) {
                //      ref https://socket.io/docs/v4/rooms/#disconnection
                //      connect to all rooms disconnected
                socket.rooms = connectionsDriver[driver_id].rooms
                connectionsDriver[driver_id] = socket
                console.log('connection already exist, socket updated:' + socket.id);
            } else {
                console.log('connection add:' + socket.id);
                socket.driver_id = driver_id;
                connectionsDriver[socket.driver_id] = socket

            }

        } else if (userType == 'rider') {

            const rider_id = await verifyRider(token);
            //console.log(rider_id)
            if (rider_id in connectionsRider) {
                socket.rooms = connectionsRider[rider_id].rooms
                connectionsRider[rider_id] = socket // updating socket
                console.log('connection already exist, socket updated:' + socket.id);
            } else {
                console.log('connection add:' + socket.id); // todo
                socket.rider_id = rider_id;
                connectionsRider[socket.rider_id] = socket
                // notify rider
            }
        }
        else {
            // throw new Error('Parameter missing')
        }
        next()
    } catch (err) {
        console.log(err);
        // server error
    }

})

riderNameSpace.use(async (socket, next) => {
    try {
        // token as passed as auth in io function at frontend
        const token = socket.handshake.auth.token;
        // the token is verified and rider_id is decode
        const rider_id = await verifyRider(token);
        //console.log(rider_id)
        if(rider_id){ // if valid id allow connection 
        if (rider_id in connectionsRider) {
            socket.rooms = connectionsRider[rider_id].rooms
            connectionsRider[rider_id] = socket // updating socket
            console.log('connection already exist, socket updated:' + socket.id);
        } else {
            console.log('connection add:' + socket.id); // todo
            socket.rider_id = rider_id;
            connectionsRider[socket.rider_id] = socket
        }
        next()
    }
    else{
        socket.disconnect();
    }
    } catch (err) {
        console.log(err);
        // server error
    }
})

io.engine.on("connection_error", (err) => {
    console.log(err.req);      // the request object
    console.log(err.code);     // the error code, for example 1
    console.log(err.message);  // the error message, for example "Session ID unknown"
    console.log(err.context);  // some additional error context
});

io.on('connection', function (socket) {
    count++;
    console.log('wola')

    socket.on('disconnect', function (msg) {
        count--;
        console.log(msg)
        //io.emit('users.count', count);
    });

    //    // for requesting a driver from the list shown on rider dashboard 
    //    socket.on('request a ride', function (data){ // provide driver id , details in data as Object
    //     connectionsDriver[data.id].emit('ride requested',data.details);
    //     console.log(data);
    //    });


    //requesting ride to all available drivers in s2 Cell
    socket.on('request ride', function (data) { // provide driver ids , details in data as Object
        const room = 'room_' + socket.rider_id
        socket.join(room)


        for (driver_id in data.drivers && driver_id in Object.keys(connectionsDriver)) {
            connectionsDriver[driver_id]
        }
    });

    socket.on('ride accepted', () => {
        console.log('rider accepted')
        // todo 
    })

    socket.on('ride rejected', () => {
        //todo
    });

    socket.on('ride cancelled', () => {

    })

    socket.on('close connection', function (data) {
        if (socket.auth.user === 'rider') {
            //delete from connection
            delete connectionsRider[socket.auth.rider_id];
        } else if (socket.auth.user == 'driver') {
            delete connectionsDriver[socket.auth.driver_id];
        }

    })

});



const PORT = process.env.SOCKET_PORT || 5002
server.listen(PORT, () => {
    console.log('server live on http://localhost:' + PORT);
})