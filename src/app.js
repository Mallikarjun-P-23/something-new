import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes.js';


const app=express();
app.use(cors({
    origin: process.env.CORS_ORIGIN ,
    credentials: true
}))

app.use(express.json({limit :"16kb"}))
app.use(express.urlencoded({extended:true, limit:"16kb"}));
app.use(express.static('public'));
app.use(cookieParser());


app.use('/api/v1/users', userRoutes); 

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Server is running!',
        timestamp: new Date().toISOString() 
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        database: 'Connected' // You can import mongoose here if needed
    });
}); 


export {app};