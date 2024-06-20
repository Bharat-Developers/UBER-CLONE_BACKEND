import jwt from 'jsonwebtoken';

export default async function (token) {
    let id
    await jwt.verify(token, process.env.SECRET_KEY_DRIVER, (error, decoded) => {
        console.log(token, process.env.SECRET_KEY_DRIVER)
        if (error) {
            console.log('hi');
            console.log(error.message);
            console.log('hi');
            return new Error("not authorized");
        } else {
            id = decoded.driver.id;
        }
    })
    return id
}


// this function decode the token and return Object id of driver