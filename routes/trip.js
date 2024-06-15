import Trip from "../models/Trip.js";
import authRider from '../middlewares/rider_jwt.js';
import authDriver from '../middlewares/driver_jwt.js';
import { Router } from "express";

const router = Router();

router.post('/create',authDriver,async(req,res,next)=>{
    try{
        const newtrip = new Trip()
        newtrip.customerId = req.body.customerId
        newtrip.driverId = req.driver.driverId
        newtrip.status = 'reaching'// reaching to destination
        newtrip.source = [req.body.source.latitude,req.body.source.longitude]
        newtrip.destination = [req.body.destination.latitude,req.body.destination.longitude]
        newtrip.amount = [req.body.amount]

        newtrip.save()

        return res.status(201).json({
            success: true,
            trip: newtrip,
            msg: 'new trip created'
        })
    }catch(error){
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: "Server Error"
        });
    }
})

router.post('/status',authDriver,async(req,res,next)=>{
    try{
        const status = req.body.status
        const trip_id = req.body.id
        const trip = await Trip.findById(trip_id)
        if(trip.driverId == req.driver.id){
            trip.status = status
            trip.save()

            return res.status(200).json({
                success: true,
                trip: trip,
                msg: 'status updated for trip'
            })
        }else{
            return res.status(401).json({
                msg:'Unauthorized request',
                success: false
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: "Server Error"
        }); 
    }
})


router.post('/cancel',authRider,async(req,res,next)=>{
    try{
        const status = req.body.status
        const trip_id = req.body.id
        const trip = await Trip.findById(trip_id)
        if(trip.customerId == req.rider.id){
            trip.status = status
            trip.save()

            return res.status(200).json({
                success: true,
                trip: trip,
                msg: 'trip canceled'
            })
        }else{
            return res.status(401).json({
                msg:'Unauthorized request',
                success: false
            })
        }
    }catch(error){
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: "Server Error"
        }); 
    }
})
export default router;
//endpoints
//post : '/create' from driver to create trip
//post: '/status' from driver to update status or cancel
//post: '/cancel' from rider to cancel trip