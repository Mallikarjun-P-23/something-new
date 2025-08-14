import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/Subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel ID")
    }

    const channel =await User.findById(channelId)
    if(!channel){
        throw new ApiError(404,"Channel not found")
    }

    if(channelId=== req.user._id.toString()){
        throw new ApiError(400,"You cannot subscribe to your own channel")
    }

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id
    });

    let subscription ;
    if(existingSubscription){
      await Subscription.findByIdAndDelete(existingSubscription._id)
      subscription =null
    }
    else{
        subscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user._id
        })
    }

    return res
          .status(200)
          .json(new ApiResponse(200,{subscription}, existingSubscription ? "Unsubscribed successfully" : "Subscribed successfully"))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel ID")
    }

    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError(404,"Channel not found")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match:{
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriber",
                foreignField:"_id",
                as:"subscriber",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            avatar:1,
                            fullname:1
                        }
                    }
                ]

            }

        },
        {
            $addFields:{
                subscriber:{
                    $arrayElementAt:["subscriber",0]
                }
            }
        },
        {
            $project:{
                _id:0,
                subscriber:1,
                subscribedAt: "$createdAt"
            }
        }
    ]);
    return res
          .status(200)
          .json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
   
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid Subscriber ID")
    }
    const user = await User.findById(subscriberId)
    if(!user){
        throw new ApiError(404,"User not found")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match:{
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channel",
                pipeline:[
                    {
                        $project:{
                            username:1,
                            avatar:1,
                            fullname:1
                        }
                    }
                ]

            }
        },
        {
            $addFields:{
                channel:{
                    $arrayElementAt:["channel",0]
                }
            }
        },
        {
            $project:{
                _id:0,
                channel:1,
                subscribedAt: "$createdAt"
            }
        }
    ]);

    return res
          .status(200)
          .json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}