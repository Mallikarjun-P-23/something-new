import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Vedio} from "../models/vedio.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid Video ID")
    }

    const vedio = await Vedio.findById(videoId)
    if(!vedio){
        throw new ApiError(404,"Video not found")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        user: req.user._id
    });

    let like;
    if(existingLike){
        await Like.findOneAndDelete(existingLike._id)
    }else{
        like = await Like.create({
            video:videoId,
            user:req.user._id
        })
    }

    return res
          .status(200)
          .json(
            new ApiResponse(200, {like}, existingLike ? "Unliked successfully" : "Liked successfully")
          )

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid Comment ID")
    }
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"Comment not found")
    }

    const existingLike =await like.findOne({
        comment:commentId,
        user:req.user._id
    })
    let like;
    if(existingLike){
        await Like.findOneAndDelete(existingLike._id)
    }else{
        like = await Like.create({
            comment:commentId,
            user:req.user._id
        })
    }
    return res
          .status(200)
          .json(
            new ApiResponse(200, {like}, existingLike ? "Unliked successfully" : "Liked successfully")
          )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid Tweet ID")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404,"Tweet not found")
    }
    const existingLike = await Like.findOne({
        tweet: tweetId,
        user:req.user._id
    })

    let like;
    if(existingLike){
        await Like.findOneAndDelete(existingLike._id)
    }
    else{
        like= await Like.create({
            tweet:tweetId,
            user:req.user._id
        })
    }
   
    return res 
            .status(200)
            .json(
                new ApiResponse(200,{like},existingLike ? "Unliked successfully" : "Liked successfully")
            )
})



const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const LikkedVideos = await Like.aggregate([
        {
            $match:{
                 likedBy:new mongoose.Types.ObjectId(req.user._id),
                 video:{$exists:true}
            }
        },
         {
                $lookup:{
                    fron:"vedios",
                    localField:"video",
                    foreignField:"_id",
                    as:"video",
                    pipeline:[
                        {
                            $lookup:{
                                from:"owners",
                                localField:"owner",
                                foreignFIeld:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            name:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                  owner: { $arrayElemAt: ["$owner", 0] }
                            }
                        },
                        {
                        $match: {
                            isPublished: true
                        }
                    }
                    ]
                }
            },
            {
                $addFields:{
                    video:{
                        video: { $arrayElemAt: ["$video", 0] }
                    }
                }
            },
             {
            $match: {
                video: { $ne: null }
            }
        },
        {
            $project: {
                _id: 0,
                video: 1,
                likedAt: "$createdAt"
            }
        }
    ])
     return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
 
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}