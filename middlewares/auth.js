
import { expressjwt } from "express-jwt";

//authentication
export const isAuthenticated = expressjwt({
    secret: process.env.JWT_SECRET_KEY,
    algorithms: ['HS256'],
    requestProperty: "auth",
});

//authorization


export const authorizedRoles = (...allowedRoles) => {
    return (req, res, next) => {

//ensure user is authenticated

if(!req.auth){
    return res.status(401).json({message:"please log in"})
}

        if (!allowedRoles.includes(req.auth.role))
             {
            return res.status(403).json({ message: "access denied: no permission" })
             }
     next()
    };
};







