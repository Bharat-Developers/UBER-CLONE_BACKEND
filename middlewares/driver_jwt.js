import jwt from 'jsonwebtoken';

// export default :- return this function whenever file is called
export default async function(req,res,next){
    const token = req.header("Authorization")
    // no token exist 
    if(!token){
        return res.status(401).json({
            msg : "No token, Authorization denided"
        });
    }

    try{
        //verifying the token
        await jwt.verify(token, process.env.SECRET_KEY_DRIVER, (err , decoded) => {
            if(err){// error on invalid token
                res.status(401).json({
                    msg: "Token not valid"
                });
            }else{
                 // data passed to next function  here driver: {id: driver._id}
                req.driver  = decoded.driver
                next(); 
            }
          });
    }
    catch(err){
        console.log('Something wend wrong with middleware ' + err);
        res.json(500).json({
            msg: 'Server error'
        });
    }
          
}