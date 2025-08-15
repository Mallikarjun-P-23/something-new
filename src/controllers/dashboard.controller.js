import mongoose from "mongoose";
import {Video} from "../models/video.model.js";
import {Subscription} from "../models/subscription.model.js";
import {Like} from "../models/like.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id; // Get channel ID from authenticated user

    // Get total video views
    const totalViews = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    // Get total subscribers count
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    });

    // Get total videos count
    const totalVideos = await Video.countDocuments({
        owner: channelId
    });

    // Get total likes on all videos
    const totalLikes = await Like.countDocuments({
        video: { $in: await Video.find({ owner: channelId }).distinct('_id') }
    });

    // Get last 5 videos with their performance
    const recentVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        {
            $limit: 5
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" }
            }
        },
        {
            $project: {
                title: 1,
                views: 1,
                likesCount: 1,
                createdAt: 1,
                thumbnail: 1
            }
        }
    ]);

    const stats = {
        totalViews: totalViews[0]?.totalViews || 0,
        totalSubscribers,
        totalVideos,
        totalLikes,
        recentVideos
    };

    return res
        .status(200)
        .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user._id; // Get channel ID from authenticated user
    const { page = 1, limit = 10, sortBy = "createdAt", sortType = "desc" } = req.query;

    const sortCriteria = {};
    sortCriteria[sortBy] = sortType === "desc" ? -1 : 1;

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sortCriteria,
        collation: {
            locale: 'en'
        }
    };

    const videos = await Video.aggregatePaginate(
        Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes"
                }
            },
            {
                $addFields: {
                    likesCount: { $size: "$likes" }
                }
            },
            {
                $project: {
                    title: 1,
                    description: 1,
                    thumbnail: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    likesCount: 1
                }
            }
        ]),
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export {
    getChannelStats, 
    getChannelVideos
};