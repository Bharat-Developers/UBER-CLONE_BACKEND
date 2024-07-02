import jwt from 'jsonwebtoken';

export default async function (token) {
    let id
    await jwt.verify(token, process.env.SECRET_KEY_HASH, (error, decoded) => {
        if (error) {
            console.log(error.message+ 'in hashing');
            return new Error("not authorized");
        } else {
            id = decoded.id;
        }
    })
    return id
}
