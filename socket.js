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
import { error } from 'console';
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
io.on('connection',(socket)=>{
    count++;

    socket.on('disconnect', function (msg) {
        count--;
        console.log(msg)
        console.log('disconnected')
        //io.emit('users.count', count);
    });

    socket.on('join room',(room_id)=>{
        socket.join(room_id)
    })

    socket.on('request ride', async function (data){
        connect(); // connect to db
        //console.log(data.name)
        const cell_ids = getCell_Ids({latitude: data.coor.lat,longitude: data.coor.lon})// get cell ids of 30 cells around current cell
        const drivers_id = []
        //console.log(cell_ids)
        for(let i=0;i< cell_ids.length;i++){
            console.log(i+' ')
            const cell = await AvaliableDriver.findOne({cell_id: (cell_ids[i]).toString()})
            
            //if cell not exist , skip
            if(cell){
                const driver_list = cell.drivers
                for(let j=0;j<driver_list.length;j++){
                    drivers_id.push(driver_list[j])
                }
                //console.log(drivers_id)
            }
            
        }
         if(drivers_id.length<1){
            socket.emit('no driver')
            console.log('no driver found')
         }else{
            const driversLatlon = []
            for(const id of drivers_id){
                const driver = await Driver.findById(id).select("latLon availablity")
                if(driver.availablity){
                    driversLatlon.push(driver.latLon)
                }

            }
            socket.emit('drivers latLon', driversLatlon )
            
            // request to all driver connected in region
            const room = (Math.floor(Math.random()*1000000)).toString()
            socket.join(room)
            for(let p = 0; p< drivers_id.length;p++){
                if(drivers_id[p].toString() in connectionsDriver){
                    console.log('000')
                    connectionsDriver[drivers_id[p].toString()].join(room)
                    console.log(connectionsDriver[drivers_id[p]].rooms)
                    //connectionsDriver[drivers_id[p].toString()].emit('ride request','hello')
                }
            }

            const payload = {
                rider:{
                    id: socket.rider_id
                }
            }

            jwt.sign(payload,process.env.SECRET_KEY_HASH,{
                expiresIn: '100m' // 100 mintues
            },(error,token)=>{
                if(error){
                    console(error)
                }else{
                    socket.to(room).volatile.emit('ride request',{details: data.details, room_id: room,rider_id:token},()=>{
                        console.log('sended request')
                    })
                }
                
            })
            
         }
         

    })


    socket.on('cancel trip',(data)=>{
        // set trip status cancelled here
        socket.to(data.room_id).emit('canceled',data)
    })

    socket.on('accept ride', async function (data){ // https://github.com/socketio/socket.io/issues/3042
        try{
        socket.to(data.room_id).emit('tranfered',{room_id: data.room_id}) // sending all other drivers that room is close
        io.of('/').socketsLeave(data.room_id) // drivers leave room
        socket.join(data.room_id);
        const rider_id = await verifyHash(data.rider_id)
        connectionsRider[rider_id].join(data.room_id);

            
            const driver_id =  await verifyDriver(data.token)
            
            const driver = await Driver.findById(driver_id.toString()).select('-_id name number latLon cabId')
            const cab = await Cab.findById(driver.cabId)
            // create new trip here
            socket.to(data.room_id).emit('driver-detials',
                {
                    name: driver.name,
                    number: driver.number,
                    Rc: cab.rCNo,
                    latLon : driver.latLon,
                    amount : data.amount
                }
            ) //goes to rider page

        }catch(error){
            console.log(error)
        }
    })

    socket.on('start trip',(data)=>{
        try{
            //verify otp here data.otp
            socket.to(data.details.room_id).emit('trip started') // notify on rider side
        }catch(error){
            console.log(error.message)
        }
    })

    socket.on('close connection', function (data) {
            delete connectionsRider[socket.rider_id];
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