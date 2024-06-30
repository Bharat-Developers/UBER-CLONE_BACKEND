import { Router } from 'express';
const router = Router();
import Driver from '../models/Driver.js';
import Cab from '../models/cab.js';
import { hash, verify } from 'argon2';
import jwt from 'jsonwebtoken';
import auth from '../middlewares/driver_jwt.js'; // middleware
import { connect } from '../config/db.js';

//1.  signUp for driver and register cab
router.post("/signUp",async(req,res) => {
    const {email,password,name,number,location,language,aadhar,dob,termsAccepted,cabType,RCNo,vehicleModel} = req.body
    //make sure the values are checked and validated at frontend
    try{
        await connect(); // connecting to db
        let driver_exist = await Driver.findOne({email: email});

        if(driver_exist){
          return  res.status(409).json({success: false, msg: "driver already exist"});
           // 409 is used whenever there is a conflict in the current state of a resource that prevents the server from fulfilling the request
        }
        //create a new driver 
        let driver = new Driver();
        driver.email = email
        driver.number = number
        driver.termsAccepted = termsAccepted
        driver.name = name
        driver.location = location
        driver.language = language
        driver.aadhar = aadhar
        driver.cabType = cabType
        driver.availablity = false
        driver.dob = dob

        //linking cab with driver
        let cab = new Cab();
        cab.rCNo = RCNo // registration certificate number
        cab.driverId = driver._id
        cab.vehicleModel = vehicleModel
        cab.save()

        driver.cabId = cab._id
        //hashing password
        driver.password = await hash(password)
        //save the driver
        await driver.save()

        //create jsonWebToken

        const payload = {
            driver : {
                id : driver._id
            }
        }

        jwt.sign(payload,process.env.SECRET_KEY_DRIVER,{
            expiresIn: '14400m' // 10 days
        },(err, token) => {
            if (err) throw err;

            res.status(201).json({
                success: true,
                token: token,
                msg: "Driver Created"
            });
            // The HTTP 201 Created success status response code indicates that the request has succeeded and has led to the creation of a resource.
        
        });
        
    }catch(error){
        //HTTP 500 Internal Server Error 
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: 'Something went wrong'
        });
    }
});

//2. sign in driver

router.post("/login",async (req,res) => {
    const {email,password} = req.body;
    //make sure the values are checked and validated at frontend
    try{
        await connect(); // connecting to db
        let driver = await Driver.findOne({email:email});
        if(!driver){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'Driver not exist , register to contiune'
            });
        }

        const isMatch = await verify(driver.password,password)

        if(!isMatch){
            // HTTP status code 401 => "Unauthorized", 
            return res.status(401).json({
                success: false,
                msg: 'Unauthorized, invalid password'
            });
        }

            //create jsonWebToken

            const payload = {
                driver : {
                    id : driver._id
                }
            }
    
            jwt.sign(payload,process.env.SECRET_KEY_DRIVER,{
                expiresIn: '14400m' // 10 days
            },(err, token) => {
                if (err) throw err;
    
                res.status(200).json({
                    success: true,
                    token: token,
                    msg: "Driver loged in"
                });
                // HTTP status code 200 for successful requests that retrieve or update a resource
            });

    }catch(error){
        //HTTP 500 Internal Server Error 
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: 'Something went wrong'
        });
    }
});


//3. update a driver 
//  getting driver id from jwt token
router.put("/", auth, async(req,res) => {
    try{
        await connect(); // connecting to db
        let driver = await Driver.findById(req.driver.id);

        if(!driver){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'driver not exist'
            });
        }

        driver = await Driver.findByIdAndUpdate(req.driver.id,req.body.driver, {
            new: true, // return the updated driver
            runValidators: true // validate the Schema
        }).select('-password -_id')

        res.status(200).json({
            success: true,
            driver: driver,
            msg: "driver updated succesfully"
        });

    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Something went wrong'
         });
    }
});
//4. delete a driver
router.delete("/",auth,async(req,res) => {
    try{
        await connect(); //connect to db
        let driver = await Driver.findById(req.driver.id).select("-password -_id")
        let cab = await Cab.findById(driver.cabId)
        if(!driver || !cab){
            // 404 resource not found 
            return req.status(404).json({
                success: false,
                msg: "driver or cab not exist"
            });
        }

        driver = await Driver.findByIdAndDelete(req.driver.id)
        cab = await Cab.findByIdAndDelete(driver.cabId)
        //Upon successfully removing the user, HTTP status code 204 (No Content) is returned and no response body is provided. 
        // but here status 200 is used to return response success msg
        res.status(200).json({
            success: true,
            msg: "driver deleted Sccessfully"
        });
    }catch(error){
        console.log(error)
        res.status(500).json({
            success: false,
            msg: 'Server Error'
        });
    }
});

//5. Get user details
router.get("/",auth, async(req,res) => {
    try{
        const driver = await Driver.findById(req.driver.id).select('-password -_id')
        if(!driver){
             //404 return code actually means 'resource not found'
             return res.status(404).json({
                success: false,
                msg: 'Driver not exist , register to contiune'
            });
        }

        res.status(200).json({
            success: true,
            driver: driver
        });
       
    }catch(error){
        console.log(error)
        res.status(500).json({
            success: false,
            msg: 'Server Error'
        });
    }

});





//For dashboard

//when driver is ready to get trips // updating availibity
router.put('/avail',auth, async(req,res,next)=>{
    try{
        await connect(); // connecting to db
        let driver = await Driver.findById(req.driver.id);

        if(!driver){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'driver not exist'
            });
        }

        driver = await Driver.findByIdAndUpdate(req.driver.id,{availablity: req.body.availablity}, {
            new: true, // return the updated driver
            runValidators: true // validate the Schema
        }).select('-password -_id')

        res.status(200).json({
            success: true,
            driver: driver,
            msg: "driver availablity succesfully"
        });

    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Server Error'
         });
    }
});



//update driver location (lat,lon)
router.put('/latLon',auth, async(req,res,next)=>{
    try{
        await connect(); // connecting to db
        let driver = await Driver.findById(req.driver.id);

        if(!driver){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'driver not exist'
            });
        }

        driver = await Driver.findByIdAndUpdate(req.driver.id,{latLon: [req.body.latitude,req.body.longitude]}, {
            new: true, // return the updated driver
            runValidators: true // validate the Schema
        }).select('latLon -_id')

        res.status(200).json({
            success: true,
            driver: driver,
            msg: "driver Location updated succesfully"
        });

    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Server Error'
         });
    }
});

// Get driver location(lat ,lon)
router.get('/latLon',auth, async(req,res,next)=>{
    try{
        await connect(); // connecting to db
        let driver = await Driver.findById(req.driver.id);

        if(!driver){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'driver not exist'
            });
        }

        driver = await Driver.findById(req.driver.id).select('latLon -_id')

        res.status(200).json({
            success: true,
            driver: driver,
            msg: "driver Location fetch succesfully"
        });

    }catch(error){
         //HTTP 500 Internal Server Error 
         console.log(error)
         return res.status(500).json({
             success: false,
             msg: 'Server Error'
         });
    }
});


export default router;

//endpoints

// post: "/signUp" = signUp driver
// post: "/login"  = login driver
// put: "/"        = update driver
// delete: "/"     = delete driver
// get: "/"        = get driver details
// put: "/avail"   = update availablity
// put: '/latLon'  = update driver lat lon
// get: '/latLon'  = get driver lat lon