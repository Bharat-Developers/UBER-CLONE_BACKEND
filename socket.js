import express from 'express';
import {createServer} from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server(server);
dotenv.config()
const count = io.engine.clientsCount;
io.on('connection',()=>{
    console.log('I am connected')
    console.log(count)
})
io.on('request_driver',() => {
    io.emit('send_request', () => {})
})

io.on('resquest_accept',() => {
    io.emit('confirmed',() => {})
})

io.on('send_location_rider',()=>{  // update location while trip is on
    io.emit('update_location_driver',() => {})
})

io.on('send_location_driver',() => {
    io.emit('update_location',()=>{

    })
})

io.engine.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});

const PORT = process.env.SOCKET_PORT || 5002
server.listen(PORT,() => {
    console.log('server live on http://localhost:'+PORT);
})