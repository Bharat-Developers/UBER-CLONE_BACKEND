import jwt from 'jsonwebtoken';

export default async function (token) {
    let id
    await jwt.verify(token, process.env.SECRET_KEY_RIDER, (error, decoded) => {
        if (error) {
            
            console.log(error.message+ 'in rider');
            return new Error("not authorized");
        } else {
            id = decoded.rider.id;
            
        }
    })
    return id
}


// this function decode the token and return Object id of rider