import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } =req.body
    if(!content){
        throw new ApiError(400,"Content is required")
    }

    const tweet =await Tweet.create({
        content,
        owner:req.user._id
    })

    if(!tweet){
        throw new ApiError(500,"Failed to create tweet")
    }
    return res 
            .status(201)
            .json(new ApiResponse(201,tweet,"Tweet created successfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const userId = req.user._id
    const {page =1, limit =10} =req.query
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user ID")
    }
    const user = await User.findById(userId).select("-password -refreshToken")
    if(!user){
        throw new ApiError(404,"User not found")
    }


    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
    };

    const tweets =await Tweet.aggregatePaginate(
        Tweet.aggregate([
            {
                $match:{
                    owner : new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                username:1,
                                avatar:1
                            }
                        }
                    ]

                }
            },
            {
                $addFields:{
                    owner:{$arrayElemAt:["owner",0]}
                }
            }
        ]
        ),
        options

    )

    res.status(200).json(new ApiResponse(200,tweets,"User tweets fetched successfully"))

})


const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
     const {tweetId} =req.params

     const {content} =req.body

     if(!isValidObjectId(tweetId)){
         throw new ApiError(400,"Invalid tweet ID")
     }

     if(!content){
        throw new ApiError(400,"content is required")
     }

     const tweet = await Tweet.findById(tweetId)

     if(!tweet){
         throw new ApiError(404,"Tweet not found")
     }
     
     if(!tweet.owner.equals(req.user._id)){
            throw new ApiError(403,"You are not allowed to update this tweet")
     }


     const updateTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {content},
        {new:true, runValidators:true}
     )

     return res.
            status(200)
            .json(new ApiResponse(200,updateTweet,"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const {tweetId} =req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweet ID")
    }
    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }

    if(!tweet.owner.equals(req.user._id)){
        throw new ApiError(403,"You are not allowed to delete this tweet")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    if(!deletedTweet){
        throw new ApiError(500,"Failed to delete tweet")
    }
    return res
            .status(200)
            .json(new ApiResponse(200,deletedTweet,"Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}