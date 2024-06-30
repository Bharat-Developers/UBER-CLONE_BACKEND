import jwt from 'jsonwebtoken';

export default async function (token) {
    let id
    await jwt.verify(token, process.env.SECRET_KEY_DRIVER, (error, decoded) => {
        
        if (error) {
           // console.log(error)
            console.log(error.message+ ' in driver');
            return new Error("not authorized");
        } else {
            id = decoded.driver.id;
        }
    })
    return id
}


// this function decode the token and return Object id of driver