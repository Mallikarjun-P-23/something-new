import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{
    try{
        const connectInstance= await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)

        console.log(`MongoDB connected: ${connectInstance.connection.host}`);
    }
     catch(err){
        console.log("MongoDB connection failed:", err.message);
        process.exit(1); // Exit the process with failure
     }
}

export default connectDB