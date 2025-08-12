import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async(userId)=>{
    try{
        const user =await User.findById(userId);
        const accessToken = user.generateToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken= refreshToken;
        user.save({validateBeforeSave: false});

         return {accessToken,refreshToken};

    }catch(error){
        throw new ApiError(500, "Error generating tokens");
    }
}

const registerUser = asyncHandler(async (req,res)=>{
     const {
        fullname,email,username,password 
     } = req.body
     console.log("email",email)


    //  if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    //  }
    if(
        [fullname,email,username,password].some((field) => field?.trim()==="")
    )
    {
        throw new ApiError(400, "All fields are required")
    }

   const existedUser= await User.findOne({
        $or: [{username},{email}]
    })
     
    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath= req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    console.log("Avatar path:", avatarLocalPath);
    console.log("Cover image path:", coverImageLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }
    

    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar upload failed")
    }

   const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"User creation failed")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    )
})

const loginUser= asyncHandler (async (req,res)=>{
    //req body ->data
    //username or email
    //find user
    //check password
    //generate token
    //send token


    const {
    username,
    password,
    email
    }= req.body

    if(!username && ! email ){
        throw new ApiError(400,"Username and email are required")
    }
    const user = await User.findOne({$or : [{username},{email}]})

    if(!user){
        throw new ApiError(401,"Invalid username ")
    }

    const isPasswordValid =await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid password")
    }


    const {accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)


    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")
    
    const option ={
        httpOnly : true,
        secure : true,

    }

    return res.status(200)
         .cookie("accessToken", accessToken , option)
         .cookie("refreshToken", refreshToken, option)
         .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken,
                    refreshToken
                },
                "User logged In Successfully"
            )
         )
      
})

const logoutUser = asyncHandler(async (req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        } 
    )
    const option ={
        httpOnly : true,
        secure : true,

    }

    return res.status(200)
         .clearCookie("accessToken", option)
         .clearCookie("refreshToken", option)
         .json(new ApiResponse(200,{},"User logged out "))
})

const refreshAccessToken = asyncHandler(async (req,res) =>{
    const incomingRefreshToken = req.cookies.
     refreshToken || req.body.refreshToken;

     if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
     } 

    try {
        const decodedToken = jwt.verify
        (
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
      
        if(incomingRefreshToken != user.refreshToken){
            throw new ApiError(401,"Refresh token is expired or invalid")
        }
    
        const option ={
            httpOnly : true,
            secure : true,
        }
    
       const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken",accessToken, option)
            .cookie("refreshToken",newRefreshToken, option)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message ||
            "Invalid refresh token"
        )
        
    }
})

const changeCurrentPassword = asyncHandler(async (req,res)=> {
    const {oldPassword,newPassword} = req.body
     const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Old password is incorrect")
    }

    user.password = newPassword
   await user.save({validateBeforeSave:false})

   return res 
          .status(200)
          .json(
              new ApiResponse(200, {}, "Password changed successfully")
          )
})


const getCurrentUser= asyncHandler( async (req,res)=>
{
    return res
           .status(200)
           .json(
               new ApiResponse(200, req.user, "current user fetched successfully")
           )
})

const updateAccountDetails = asyncHandler (async (req,res)=>{
    const {fullname,email} = req.body
    if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set :{
                fullname ,
                email
            }
        },
        {new:true}
    ).select("-password")

    return res
           .status(200)
           .json(
               new ApiResponse(200,user,"Account details updated successfully")
           )
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath =req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
  
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
            .status(200)
            .json(
               new ApiResponse(200,user,"Avatar Uploaded successfully")
            )
})

const updateUseCoverImage = asyncHandler(async (req,res)=>{
    const coverImageLocalPath =req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverimage file is missing")
    }
  
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage)
    {
        throw new ApiError(400,"Error while uploading on cover image")
    }
  
   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")
    
    
    return res
            .status(200)
            .json(
               new ApiResponse(200,user,"Cover Image Uploaded successfully")
            )

})

const getUserChannelProfile = asyncHandler(async (req,res) =>{
    const {username} =req.params //params will give the username from the url

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
   // User.find({username}). we apply direct aggregation pipeline
   const channel= await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",// model name is converted to lowercase and pluralized
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"  // this is full for no of subscribers
        }
    },
    {
        $lookup:{
           from:"subscriber",// model name is converted to lowercase and pluralized
            localField:"_id",
            foreignField:"channel",
            as:"subscribedTo" 
        }
    },{
        $addFields:{
            subscribersCount:{
                $size: "$subscribers"
            },
            subscribedToCount:{
                $size: "$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},// check if the user it is in object of subscribes subscribed to the channel
                    then:true,
                    else:false
                }

            }

        }
    },
    {
        $project:{// we are projecting the fields we want to return
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar :1,
            coverImage:1,
            email:1

        }
    }
   ])

   if(!channel?.length){
    throw new ApiError(404,"Channel not found")
   }

   return res 
          .status(200)
          .json(
            new ApiResponse(
                200,
                channel[0], // since we are using aggregate it will return an array
                "Channel fetched successfully"
            )
          )
})

export { registerUser ,
        loginUser,
        logoutUser, 
        refreshAccessToken ,
        getCurrentUser ,
        updateAccountDetails, 
        updateUserAvatar ,
        getUserChannelProfile
}