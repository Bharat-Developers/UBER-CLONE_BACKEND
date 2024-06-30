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


// using middleware function for driver
driverNameSpace.use(async (socket, next) => {
    try {
        // token and usertype are passed as auth in io function at frontend
        const token = socket.handshake.auth.token;
        // the token is verified and _id is decoded , socket is added to connections list as {id : socket} pair 
            const driver_id = await verifyDriver(token);
            //console.log(driver_id)
            if(driver_id){
            if (driver_id in connectionsDriver) {
                //      ref https://socket.io/docs/v4/rooms/#disconnection
                //      connect to all rooms disconnected
                // for(const room of connectionsRider[driver_id].rooms){
                //     socket.join(room)
                // }
                socket.driver_id = driver_id
                connectionsDriver[driver_id] = socket
                console.log('connection already exist driver, socket updated:' + socket.id);
                console.log(socket.driver_id)
            } else {
                console.log('connection add:' + socket.id);
                
                socket.driver_id = driver_id;
                connectionsDriver[socket.driver_id] = socket
                //console.log('driver connection' + connectionsDriver[driver_id].driver_id)
                console.log(socket.driver_id)
            }
            next()
        }else{
            socket.disconnect(true);
        }
        
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
            // for(const room in connectionsRider[rider_id].rooms){
            //     socket.join(room)
            // }
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
    else{
        socket.disconnect(true);
    }
    } catch (err) {
        console.log(err);
        // server error
    }
})



riderNameSpace.on('connection',function(socket){
    count++;

    socket.on('disconnect', function (msg) {
        count--;
        console.log(msg)
        console.log('disconnected')
        //io.emit('users.count', count);
    });

    socket.on('request ride', async function (data){
        connect();
        //console.log(data.name)
        const cell_ids = getCell_Ids({latitude: data.coor.lat,longitude: data.coor.lon})// get cell ids of 30 cells around current cell
        const drivers_id = []
        console.log(cell_ids)
        for(let i=0;i< cell_ids.length;i++){
            console.log(i+' ')
            const cell = await AvaliableDriver.findOne({cell_id: (cell_ids[i]).toString()})
            
            //if cell not exist , skip
            if(cell){
                console.log(cell.drivers.length)
                const driver_list = cell.drivers
                for(let j=0;j<driver_list.length;j++){
                    drivers_id.push(driver_list[j])
                }
                console.log(drivers_id,"helo")
            }
            
        }
         if(drivers_id.length<1){
            socket.emit('no driver')
            console.log('hee')
         }else{
            const driversLatlon = []
            for(const id of drivers_id){
                const driver = await Driver.findById(id).select("latLon availablity")
                if(driver.availablity){
                    driversLatlon.push(driver.latLon)
                }

            }
            socket.emit('driver latLon', driversLatlon )
            // request to all driver connected in region
            const room = (Math.floor(Math.random()*1000000)).toString()
            socket.join(room)
            console.log(socket.rooms)
            const rooms = io.of("/rider").adapter.rooms
            console.log(rooms)
            for(let p = 0; p< drivers_id.length;p++){
                console.log(p)
                if(drivers_id[p].toString() in connectionsDriver){
                    console.log(p)
                    connectionsDriver[drivers_id[p].toString()].join(room)
                    console.log(connectionsDriver[drivers_id[p]].rooms)
                    //connectionsDriver[drivers_id[p].toString()].emit('ride request','hello')
                }
            }
            const room2 = io.of("/driver").adapter.rooms
            console.log(room2)
            socket.to(room).emit('ride request',{details: data.details, room_id: room},()=>{
                console.log('send')
            })
         }
         

    })


    socket.on('cancel trip',(data)=>{
        // set trip status cancelled here
        socket.to(data.room_id).emit('canceled',data)
    })

    socket.on('close connection', function (data) {
            delete connectionsRider[socket.rider_id];
            console.log('hey')
            socket.disconnect(true)
    })
    socket.on('hello',function(){
        console.log('hello')
    })
})

driverNameSpace.on('connection',function(socket){
    count++;

    socket.on('disconnect', function (reason,details) {
        count--;
        console.log(reason)
        console.log(details)
        //io.emit('users.count', count);
    });

    socket.on('accept ride', async function (data){ // https://github.com/socketio/socket.io/issues/3042
        console.log(data.driverDetails)
        try{
        socket.to(data.room_id).of('/driver').emit('tranfered',{room_id: data.room_id}) // sending all other drivers that room is close
        io.of('/').socketsLeave(data.room_id) // drivers leave room
        socket.join(data.room_id);

        
            const driver_id =  verifyDriver(data.token)
            const driver = await Driver.findById(driver_id).select('-_id name number latLon cabId')
            const cab = await Cab.findById(driver.cabId)
            // create new trip here
            socket.to(data.room_id).emit('driver-detials',
                {
                    name: driver.name,
                    number: driver.number,
                    Rc: cab.rCNo,
                    latLon : driver.latLon,
                }
            ) //rider page

        }catch(error){
            console.log(error)
        }
    })

    socket.on('start trip',(data)=>{
        try{
            //verify otp here data.otp
            socket.to(data.details.room_id).emit('trip started') // notify on rider side
        }catch(error){

        }
    })

    socket.on('close connection', function (data) {
            delete connectionsRider[socket.driver_id];
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