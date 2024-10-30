import Training from "../models/training.model.js";
import NodeCache from "node-cache";

// Initialize the cache with a default TTL of 600 seconds (10 minutes)
const cache = new NodeCache({ stdTTL: 600 });

export const createTraining = async (req, res) => {
  try {
    const { trainingName, category, trainingPlan, isPublic } = req.body;
    const userId = req.user?._id;
    // Validate required fields
    if (
      !trainingName ||
      !category ||
      !trainingPlan ||
      trainingPlan.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Ensure user is authenticated and has a valid userId
    if (!req.user || !userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found.",
      });
    }
    // Check if the user is an admin
    const isAdmin = req.user.isAdmin === true;

    // If user is not an admin, set isPublic to false
    const publicStatus = isAdmin ? isPublic : false;

    // Create a new Training instance with the data
    const newTraining = await Training.create({
      userId,
      trainingName: trainingName.toLowerCase(),
      category: category.toLowerCase(),
      trainingPlan,
      isPublic: publicStatus,
    });

    // Check if cacheKey exists and then delete the cache
    const cacheKey = `training_${userId}`;
    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Training plan created successfully",
      training: newTraining,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating training",
    });
  }
};

export const getTraining = async (req, res) => {
  try {
    const userId = req.user?._id;

    const { limit, page, sortBy = "createdAt", order = "desc" } = req.query;

    const cacheKey = `training_${userId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Serving from cache`);
      return res.status(200).json({
        success: true,
        message: "Training retrieved from cache successfully",
        trainingData: cache.get(cacheKey),
      });
    }

    const limitNumber = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNumber;

    const training = await Training.find({ userId })
      .sort({ [sortBy]: order === "desc" ? 1 : -1 })
      .skip(skip)
      .limit(limitNumber);

    if (!training || training.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No training found for this user",
      });
    }

    cache.set(cacheKey, training);

    res.status(200).json({
      success: true,
      message: "Training data retrieved successfully",
      userId,
      totalData: training.length,
      trainingData: training,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating training",
    });
  }
};

export const updatePublicField = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { trainingId } = req.params;
    const { isPublic } = req.body;

    const isAdmin = req.user?.isAdmin;
    if (!isAdmin) {
      return res.status(404).json({
        success: false,
        message: "Only admins can update public training data."
      });
    }

    if (isPublic === undefined || isPublic === null) {
      return res.status(400).json({
        success: false,
        message: "All field is required to update",
      });
    }

    const updatePublic = await Training.findByIdAndUpdate(
      trainingId,
      {isPublic},
      {new: true}
    )

    if (!updatePublic) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    const cacheKey = `training_${userId}`;
    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      todoData: updatePublic,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating training"
    });
  }
};

export const allPublicTrainingData = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    // Parse limit and page values
    const limitNumber = parseInt(limit) || 10;
    const skip = (parseInt(page) - 1) * limitNumber;

    // Sort order (asc or desc)
    const sortOrder = order === "asc" ? 1 : -1;

    // Get total count of public training data
    const total = await Training.countDocuments({ isPublic: true });

    const trainingData = await Training.find({ isPublic: true })
      .sort({ [sortBy]: sortOrder })
      .limit(limitNumber)
      .skip(skip);

    // Send response
    return res.status(200).json({
      success: true,
      message: "All public training data retrieved successfully",
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: parseInt(page),
      trainingData,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while getting public training data",
    });
  }
};

export const deleteTraining = async (req, res) => {
  try {
    const { trainingId } = req.params;
    const userId = req.user?._id;
    console.log(userId);
    
    const isAdmin = req.user?.isAdmin;

    // Find the training by ID
    const training = await Training.findById(trainingId);
    console.log(training);
    

    if (!training) {
      return res.status(404).json({
        success: false,
        message: "Training not found",
      });
    }

    // Check if the training is public
    const isPublic = training.isPublic;

    // If the training is public, only admins can delete it
    if (isPublic && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete public training data.",
      });
    }

    // If the training is not public, ensure that the user owns the training
    if (!isPublic && training.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this training.",
      });
    }

    // If either condition is met (admin deleting public data or user deleting their own private data), proceed with deletion
    await Training.findByIdAndDelete(trainingId);

    const cacheKey = `training_${userId}`; // Clear cache for the user's training data
    cache.del(cacheKey);

    res.status(200).json({
      success: true,
      message: "Training delete successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating training",
    });
  }
};
