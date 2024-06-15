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
        await jwt.verify(token, process.env.SECRET_KEY_RIDER, (err , decoded) => {
            if(err){// error on invalid token
                res.status(401).json({
                    msg: "Token not valid"
                });
            }else{
                // data passed to next function  here rider: {id: rider._id}
                req.rider  = decoded.rider
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