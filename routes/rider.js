import { Router } from 'express';
const router = Router();
import Rider from '../models/Rider.js';
import { hash, verify } from 'argon2';
import jwt from 'jsonwebtoken';
import auth from '../middlewares/rider_jwt.js'; // middleware
import { connect } from '../config/db.js';

//1.  signUp for rider
router.post("/signUp",async(req,res,next) => {
    const {email,password,name,number,termsAccepted} = req.body
    //make sure the values are checked and validated at frontend
    try{
        await connect(); // connecting to db
        let rider_exist = await Rider.findOne({email: email});

        if(rider_exist){
          return  res.status(409).json({success: false, msg: "rider already exist"});
           // 409 is used whenever there is a conflict in the current state of a resource that prevents the server from fulfilling the request
        }
        //create a new rider 
        let rider = new Rider();
        rider.email = email
        rider.number = number
        rider.termsAccepted = termsAccepted
        rider.name = name
        //hashing password
        rider.password = await hash(password)
        //save the rider
        await rider.save()

        //create jsonWebToken

        const payload = {
            rider : {
                id : rider._id
            }
        }

        jwt.sign(payload,process.env.SECRET_KEY_RIDER,{
            expiresIn: '300m'// 300 mintues
        },(err, token) => {
            if (err) throw err;

            res.status(201).json({
                success: true,
                token: token,
                msg: "Rider Created"
            });
            // The HTTP 201 Created success status response code indicates that the request has succeeded and has led to the creation of a resource.
        
        });;
        
    }catch(error){
        //HTTP 500 Internal Server Error 
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: 'Something went wrong'
        });;
    }
});

//2. sign in rider

router.post("/login",async (req,res,next) => {
    const {email,password} = req.body;
    //make sure the values are checked and validated at frontend
    try{
        await connect(); // connecting to db
        let rider = await Rider.findOne({email:email});

        if(!rider){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'Rider not exist , register to contiune'
            });
        }

        const isMatch = await verify(rider.password,password)

        if(!isMatch){
            // HTTP status code 401 => "Unauthorized", 
            return res.status(401).json({
                success: false,
                msg: 'Unauthorized, invalid password'
            });
        }

            //create jsonWebToken

            const payload = {
                rider : {
                    id : rider._id
                }
            }
    
            jwt.sign(payload,process.env.SECRET_KEY_RIDER,{
                expiresIn: '300m'// 300 mintues
            },(err, token) => {
                if (err) throw err;
    
                res.status(200).json({
                    success: true,
                    token: token,
                    msg: "Rider loged in"
                });
                // HTTP status code 200 for successful requests that retrieve or update a resource
            });;

    }catch(error){
        //HTTP 500 Internal Server Error 
        console.log(error)
        return res.status(500).json({
            success: false,
            msg: 'Something went wrong'
        });;
    }
});;


//3. update a rider 
// getting rider id from jwt token
router.put("/", auth, async function(req,res,next){
    try{
        await connect(); // connecting to db
        let rider = await Rider.findById(req.rider.id);

        if(!rider){
            //404 return code  means 'resource not found'
            return res.status(404).json({
                success: false,
                msg: 'rider not exist'
            });
        }

        rider = await Rider.findByIdAndUpdate(req.rider.id,req.body.rider, {
            new: true, // return the updated rider
            runValidators: true // validate the Schema
        }).select('-password -_id')

        res.status(200).json({
            success: true,
            rider: rider,
            msg: "rider updated succesfully"
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
//4. delete a rider
router.delete("/",auth,async(req,res,next) => {
    try{
        await connect(); //connect to db
        let rider = await Rider.findById(req.rider.id).select("-password -_id")

        if(!rider){
            // 404 resource not found 
            return req.status(404).json({
                success: false,
                msg: "rider not exist"
            });;
        }

        rider = await Rider.findByIdAndDelete(req.rider.id)
        //Upon successfully removing the user, HTTP status code 204 (No Content) is returned and no response body is provided. 
        // but here status 200 is used to return response success msg
        res.status(200).json({
            success: true,
            msg: "rider deleted Sccessfully"
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
router.get("/",auth, async(req,res,next) => {
    try{
        const rider = await Rider.findById(req.rider.id).select('-password -_id')
        if(!rider){
             //404 return code actually means 'resource not found'
             return res.status(404).json({
                success: false,
                msg: 'Rider not exist , register to contiune'
            });
        }

        res.status(200).json({
            success: true,
            rider: rider
        });
       
    }catch(error){
        console.log(error)
        res.status(500).json({
            success: false,
            msg: 'Server Error'
        });
    }

});

export default router


//endpoints

// post: "/signUp" = signUp rider
// post: "/login"  = login rider
// put: "/"        = update rider
// delete: "/"     = delete rider
// get: "/"        = get rider details
