import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import verifyDriver from './middlewares/verifyDriverToken.js';
import verifyRider from './middlewares/verifyRiderToken.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { connect } from './config/db.js';
import { getCell_Ids } from './functions/S2CellIds.js';
import AvaliableDriver from './models/AvaliableDrivers.js';
import Driver from './models/Driver.js';
import Cab from './models/cab.js';
import jwt from 'jsonwebtoken'
import verifyHash from './middlewares/verifyHash.js';
import Rider from './models/Rider.js'
import Trip from './models/Trip.js';
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});
dotenv.config()

const connectionsRider = {}
const connectionsDriver = {}

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const role = socket.handshake.auth.role
    try {
        if (role == 'rider') {
            const rider_id = await verifyRider(token);
            if (rider_id) { // if valid id allow connection 
                if (rider_id in connectionsRider) {
                    socket.rider_id = rider_id
                    connectionsRider[rider_id] = socket // updating socket
                    console.log('connection already exist rider, socket updated:' + socket.id);
                } else {
                    console.log('connection add:' + socket.id); // todo
                    socket.rider_id = rider_id;
                    connectionsRider[socket.rider_id] = socket
                    //console.log('ride connection '+connectionsRider[rider_id].rider_id)
                }
                next()
            }
            else {
                socket.disconnect(true);
            }
        } else if (role == 'driver') {
            const driver_id = await verifyDriver(token);
            //console.log(driver_id)
            if (driver_id) {
                if (driver_id in connectionsDriver) {
                    //      ref https://socket.io/docs/v4/rooms/#disconnection
                    //      connect to all rooms disconnected
                    socket.driver_id = driver_id
                    connectionsDriver[driver_id] = socket
                    console.log('connection already exist driver, socket updated:' + socket.id);
                } else {
                    console.log('connection add:' + socket.id);
                    socket.driver_id = driver_id;
                    connectionsDriver[socket.driver_id] = socket
                    //console.log('driver connection' + connectionsDriver[driver_id].driver_id)
                    console.log(socket.driver_id)
                }
                next()
            } else {
                socket.disconnect(true);
            }

        } else {
            console.log('invalid role')
            socket.disconnect(true);
        }
    } catch (error) {
        console.log(err);
        // server error
    }

})

let count = 0
io.on('connection', (socket) => {
    count++;

    socket.on('disconnect', function (msg) {
        count--;
        console.log(msg)
        console.log('disconnected')
        //io.emit('users.count', count);
    });

    socket.on('join room', (room_id) => {
        socket.join(room_id)
    })

    socket.on('request ride', async function (data,callback) {
        try{

        connect(); // connect to db
        const cell_ids = getCell_Ids({ latitude: data.coor.lat, longitude: data.coor.lon })// get cell ids of 30 cells around current cell
        const drivers_id = []
        //console.log(cell_ids)
        for (let i = 0; i < cell_ids.length; i++) {
            console.log(i + ' ')
            const cell = await AvaliableDriver.findOne({ cell_id: (cell_ids[i]).toString() })

            //if cell not exist , skip
            if (cell) {
                const driver_list = cell.drivers
                for (let j = 0; j < driver_list.length; j++) {
                    drivers_id.push(driver_list[j])
                }
                //console.log(drivers_id)
            }

        }
        if (drivers_id.length < 1) {
            socket.emit('no driver')
            console.log('no driver found')
        } else {
            const driversLatlon = []
            for (const id of drivers_id) {
                const driver = await Driver.findById(id).select("latLon availablity")
                if (driver.availablity) {
                    driversLatlon.push(driver.latLon)
                }

            }
            socket.emit('drivers latLon', driversLatlon)

            // request to all driver connected in region
            const room = (Math.floor(1000000 + Math.random() * 9000000)).toString()
            socket.join(room)
            for (let p = 0; p < drivers_id.length; p++) {
                if (drivers_id[p].toString() in connectionsDriver) {
                    console.log('000')
                    connectionsDriver[drivers_id[p].toString()].join(room)
                    console.log(connectionsDriver[drivers_id[p]].rooms)
                    //connectionsDriver[drivers_id[p].toString()].emit('ride request','hello')
                }
            }

            const rider_name = await Rider.findById(socket.rider_id).select('-_id name')
            data.details.name = rider_name.name
            const payload = {
                    id: socket.rider_id
            }

            jwt.sign(payload, process.env.SECRET_KEY_HASH, {
                expiresIn: '100m' // 100 mintues
            }, (error, token) => {
                if (error) {
                    console(error)
                } else {
                    socket.to(room).volatile.emit('ride request', { details: data.details, room_id: room, rider_id: token }, () => {
                        console.log('sended request')
                    })
                    callback(room)
                }

            })

        }        
    }catch(err){
        console.log(err.message)
    }


    })


    socket.on('cancel trip-rider', async (data,room, isAccepted) => {
        // set trip status cancelled here
        try{
            if(isAccepted){
                const trip_id = await verifyHash(data.trip_id)
                const trip = await Trip.findByIdAndUpdate(trip_id.toString(), {status:'canceled'}, {
                    new: true, // return the updated driver
                    runValidators: true // validate the Schema
                })
                console.log(data.room_id)
                socket.to(data.room_id).emit('canceled-rider', data)
            }else{
                socket.to(room).emit('tranfered', { room_id: room })
            }
           
        }catch(err){
            console.log(err.message)
        }
       
    })

    socket.on('cancel trip-driver', async (data) => {
        // set trip status cancelled here
        try{
            const trip_id = await verifyHash(data.trip_id)
            const trip = await Trip.findByIdAndUpdate(trip_id.toString(), {status:'canceled'}, {
                new: true, // return the updated driver
                runValidators: true // validate the Schema
            })
            
            socket.to(data.room_id).emit('canceled-driver', data)
            io.of('/').socketsLeave(data.room_id) 
        }catch(err){
            console.log(err.message)
        }
        
    })

    socket.on('accept ride', async function (data,callback) { // https://github.com/socketio/socket.io/issues/3042
        try {
            socket.to(data.room_id).emit('tranfered', { room_id: data.room_id }) // sending all other drivers that room is close
            io.of('/').socketsLeave(data.room_id) // drivers leave room
            socket.join(data.room_id);
            const rider_id = await verifyHash(data.rider_id)
            connectionsRider[rider_id].join(data.room_id);


            const driver_id = await verifyDriver(data.token)

            const driver = await Driver.findById(driver_id.toString()).select('-_id name number latLon cabId')
            const cab = await Cab.findById(driver.cabId)
            // create new trip here
            const newTrip = new Trip()
            newTrip.customerId = rider_id
            newTrip.driverId = driver_id
            newTrip.source = data.details.pickup
            newTrip.destination = data.details.dropoff
            newTrip.amount = data.details.amount
            newTrip.status = 'accepted'
            // genrate otp
            const otp = Math.floor(1000 + Math.random() * 9000)
            newTrip.otp = otp
            newTrip.save()

            const payload = {
                    id: newTrip._id
            }

            jwt.sign(payload, process.env.SECRET_KEY_HASH, {
                expiresIn: '120m'
            }, (err, token) => {
                if (err) {
                    console.log(err.message)
                } else {
                    socket.to(data.room_id).emit('driver-detials',
                        {
                            name: driver.name,
                            number: driver.number,
                            Rc: cab.rCNo,
                            latLon: driver.latLon,
                            amount: data.details.amount,
                            otp: newTrip.otp,
                            trip_id: token,
                            room_id : data.room_id
                        }
                    )

                    callback(token)
                }


            }) //goes to rider page

        } catch (error) {
            console.log(error)
        }
    })

    socket.on('start trip', async (data,errFunction,callback) => {
        try {
            //verify otp here data.otp
             console.log(data.details)
            const trip_id = await verifyHash(data.details.trip_id)
            
            const trip = await Trip.findById(trip_id.toString())
            if(trip.otp != data.otp){
                console.log('wrong otp')
                errFunction()
            }else{
                trip.status = 'onGoing'
                trip.save()
                socket.to(data.details.room_id).emit('trip started') // notify on rider side
                callback()
            }
          
        } catch (error) {
            console.log(error.message)
        }
    })

    socket.on('end trip',(data)=>{
        socket.to(data.room_id).emit('trip complete')
    })

    socket.on('close trip',async (data)=>{
        try{
            const trip_id = await verifyHash(data.trip_id)
            const trip = await Trip.findByIdAndUpdate(trip_id.toString(), {status:'completed'}, {
                new: true, // return the updated driver
                runValidators: true // validate the Schema
            })
            // create payment class here
            socket.to(data.room_id).emit('trip ended')
        }catch(err){
            console.log(err.message)
        }
       

    })


    socket.on('close connection-rider', function (data) {
        delete connectionsRider[socket.rider_id];
        console.log('hey')
        socket.disconnect(true)
    })
    socket.on('close connection-driver', function (data) {
        delete connectionsDriver[socket.driver_id];
        console.log('hey')
        socket.disconnect(true)
    })

})


io.of("/").adapter.on("create-room", (room) => {
    console.log(`room ${room} was created`);
});

io.of("/").adapter.on("join-room", (room, id) => {
    console.log(`socket ${id} has joined room ${room}`);
});
io.engine.on("connection_error", (err) => {
    console.log(err.req);      // the request object
    console.log(err.code);     // the error code, for example 1
    console.log(err.message);  // the error message, for example "Session ID unknown"
    console.log(err.context);  // some additional error context
});


const PORT = process.env.SOCKET_PORT || 5002
server.listen(PORT, () => {
    console.log('server live on http://localhost:' + PORT);
})