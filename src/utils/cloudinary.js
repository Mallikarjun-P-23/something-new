import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (filePath) => {
    try{
        if(!filePath)
            return null;
        
        const response = await cloudinary.uploader.upload(filePath,{
            resource_type: "auto"
        })
        
        console.log("file uploaded successfully", response.url);
        
        // Delete the local file after successful upload
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        return response;
    }catch(err){
        console.log("Cloudinary upload error:", err);
        
        // Delete the local file if upload fails (only if it exists)
        if(filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        return null;
    }
}

export { uploadOnCloudinary };