import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import userRoute from './routes/user.route.js';
import expenseRoute from './routes/expense.route.js';
import trainingRoute from './routes/training.route.js';

// Config .env file path
dotenv.config({
    path: './.env'
});

// Variables
const app = express();
const port = process.env.PORT || 8080;
const corsOptions = {
    origin: process.env.CORS_ORIGIN,
    credentials: true
};
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    limit: 100 // limit each IP to 100 requests per windowMs
})

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(cookieParser());
app.use(helmet());
app.use(limiter);
app.use(morgan('combined'));

// Routes
app.use('/api/v1/user', userRoute);
app.use('/api/v1/expense', expenseRoute);
app.use('/api/v1/training', trainingRoute);

// Server start after connecting to Database
connectDB()
.then(() => {
    app.get('/', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Welcome to PZ Server'
        })
    })
    app.listen(port, () => {
        console.log(`listening on port ${port}`);
    });
})
.catch((err) => {
    console.log(`Mongoose server error: ${err}`);
})
