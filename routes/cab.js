import { Router } from "express";
import Cab from "../models/cab.js";
import authDriver from "../middlewares/driver_jwt.js"
import authRider from "../middlewares/rider_jwt.js"
import { connect } from "../config/db.js";

const router = Router();

//access cab for driver
router.get("/",authDriver,async(req,res,next)=>{
    try{
        connect();
        const cab = await Cab.findOne({driverId:req.driver.id})
        
        if(!cab){
            //404 return code actually means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'no cab exist with driver'
            });
        }

        res.status(200).json({
            success: true,
            cab: cab,
            msg: "cab found"
        })
    }catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: "Server Error"
        });
    }
});

//accessing cab for rider 
router.get("/:id",authRider,async(req,res,next)=>{
    try{
        connect();
        const cab = await Cab.findOne({driverId:req.params.id})
        
        if(!cab){
            //404 return code actually means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'no cab exist with driver'
            });
        }

        res.status(200).json({
            success: true,
            cab: cab,
            msg: "cab found"
        })
    }catch(err){
        console.log(err)
        return res.status(500).json({
            success: false,
            msg: "Server Error"
        })
    }
})

export default router;

//endpoints

// get: "/"    = get details of cab for driver
// get: "/:id" = get details of cab for rider 