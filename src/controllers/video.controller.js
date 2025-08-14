import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination


    if(userId && !isValidObjectId(userId)){
        throw new ApiError(400,"Invalid user ID")
    }

    const pipeline=[]

    if(query){
        pipeline.push({
            $match:{
                $or:{
                     title:{
                        $regex:query,
                        $options:"i"
                     },
                     description:{
                        $regex:query,
                        $options:"i"
                     }

                }
            }
        })
    }

    if(userId){
        pipeline.push({
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        })
    }

    pipeline.push({
        $match: { isPublished: true }
    })

     const sortCriteria = {}
    if (sortBy && sortType) {
        sortCriteria[sortBy] = sortType === "asc" ? 1 : -1
    } else {
        sortCriteria.createdAt = -1 // Default: newest first
    }
    pipeline.push({ $sort: sortCriteria })

    // Pagination using aggregate
    const options = {
        page: parseInt(page),
        limit: parseInt(limit)
    }

    const videos = await Video.aggregatePaginate(
        Video.aggregate(pipeline),
        options
    )

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if(!title || !description){
        throw new ApiError(400,"Title and description are required")
    }
   const videoFileLocalPath=  req.files?.videoFile[0].path;
   const thumbnailLocalPath =req.files?.thumbnail[0].path;

   if(!videoFileLocalPath || !thumbnailLocalPath){
       throw new ApiError(400,"Video file and thumbnail are required")
   }

   const videoFile = await uploadOnCloudinary(videoFileLocalPath, "video")
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "thumbnail")

    if(!videoFile || !thumbnail){
        throw new ApiError(400,"Video file and thumbnail are required")
    }

    const duration = Math.round(videoFile?.duration);

    const video = await video.create({
        videoFile: videoFile?.secure_url,
        thumbnail: thumbnail?.secure_url,
        title,
        description,
        duration,
        owner: req.user._id,
        isPublished: true
    })

    if(!video){
        throw new ApiError(500,"Failed to publish video")
    }
     
    return res.status(201).json(new ApiResponse(true, "Video published successfully", video))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found")
    }

    if(!video.isPublished|| !video.owner.equals(req.user._id)){
        throw new ApiError(403,"You are not allowed to access this video")
    }

    video.views += 1
    await video.save({validateBeforeSave: false})

    return res
          .status(200)
          .json(new ApiResponse(200,video ,"Video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title ,description} =req.body
    if(!title ||!description){
        throw new ApiError(400,"Title and description are required")
    }
   
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"Video not found")
    }

    if(!video.owner.equals(req.user._id)){
        throw new ApiError(403,"You are not allowed to update this video")
    }

    let thumbnail;
    if(req.files?.thumbnail){
        thumbnail = await uploadOnCloudinary(req.files.thumbnail[0].path, "thumbnail")
        if(!thumbnail){
            throw new ApiError(400,"Failed to upload thumbnail")
        }

    }

    const updateVideo =await Video.findByIdAndUpdate(videoId,{
        $set:{
                title: title || video.title,
                description: description || video.description,
                ...(thumbnail && { thumbnail: thumbnail.url })
        }
    },
    {new : true}
)

   if(thumbnail && video.thumbnail){
     await deleteFromCloudinary(video.thumbnail)
   }

   return res
         .status(200)
         .json(new ApiResponse(200,updateVideo,"Video updated successfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }
    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"Video not found")
    }

    if(!video.owner.equals(req.user._id)){
        throw new ApiError(403,"You are not allowed to delete this video")
    }


    await deleteFromCloudinary(video.videoFile)
    await deleteFromCloudinary(video.thumbnail)
    await Video.findByIdAndDelete(videoId)
 

    return res
          .status(200)
          .json(new ApiResponse(200,{}, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video ID")
    }

    const video= await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found")
    }

    if(!video.owner.equals(req.user._id)){
        throw new ApiError(403,"You are not allowed to toggle publish status of this video")
    }

    video.isPublished=!video.isPublished;
    await video.save({validateBeforeSave:false})

    return res
          .status(200)
          .json(new ApiResponse(200,video,"Video publish status toggled successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}