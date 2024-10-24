import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const verifyJWT = async (req, res, next) => {
    try {
        // 1. Extract the token from the cookie
        const token = req.cookies?.accessToken
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: No token provided" 
            });
        }

        // 2. Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 3. Find user by decoded token's ID, excluding password and refreshToken fields
        const user = await User.findById(decodedToken?._id).select('-password -refreshToken');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: User not found" 
            });
        }

        // 4. Attach user to request object
        req.user = user;
        next();
        
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false, 
            message: "Something went wrong in verifyJWT middleware", 
            error: error.message
        }) 
    }
};

