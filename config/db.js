import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const db = await mongoose.connect(`${process.env.MONGO_URI}/project-zero`);
        console.log(`Connecting to ${db.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);        
    }
};

export default connectDB;