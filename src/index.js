import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: './.env' });

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



 