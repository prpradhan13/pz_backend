import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        required: [true, 'Username is required'],
        minlength: [5, 'Username must be at least 5 characters long']
    },
    fullname: {
        type: String,
        required: [true, 'Full name is required'],
        lowercase: true,
        trim: true,
        minlength: [5, 'Username must be at least 5 characters long']
    },
    email: {
        type: String,
        unique: true,
        trim: true,
        required: true,
        match: [/.+\@.+\..+/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: [8, 'Password must be at least 8 characters long']
    },
    isAdmin:{
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
        default: null
    },
    // isEmailVerified: { type: Boolean, default: false },
    // emailVerificationToken: { type: String },
}, {timestamps: true});

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            fullname: this.fullname,
            email: this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRATION}
    )
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {_id: this._id},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRATION}
    )
};

export default mongoose.model('User', userSchema);