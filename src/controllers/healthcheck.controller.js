import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {
    // Build healthcheck response
    const healthcheck = {
        status: 'OK',
        uptime: `${process.uptime().toFixed(2)} seconds`,
        timestamp: new Date().toISOString(),
        message: 'Service is healthy and operational',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
    };

    // Return response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                healthcheck,
                "Healthcheck successful"
            )
        );
});

export {
    healthcheck
}