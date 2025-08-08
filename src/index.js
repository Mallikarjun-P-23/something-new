import dotenv from 'dotenv';
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import connectDB from "./db/index.js";

dotenv.config({ path: './.env' });

const app = express();

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        timestamp: new Date().toISOString() 
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Connect to database and start server
connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.error("App error:", error);
            throw error;
        });

        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️  Server is running at port : ${process.env.PORT}`);
            console.log(`🔗  Server URL: http://localhost:${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed !!! ", err);
        // Start server anyway without database
        app.listen(process.env.PORT || 8000, () => {
            console.log(`⚙️  Server is running at port : ${process.env.PORT} (without database)`);
            console.log(`🔗  Server URL: http://localhost:${process.env.PORT}`);
        });
    });



 
