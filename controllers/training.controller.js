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

    // Create a new Training instance with the data
    const newTraining = await Training.create({
      userId,
      trainingName: trainingName.toLowerCase(),
      category: category.toLowerCase(),
      trainingPlan,
      isPublic
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

    const { limit, page, sortBy = "date", order = "desc" } = req.query;

    const cacheKey = `training_${userId}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log("Serving from cache");
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

export const deleteTraining = async (req, res) => {
  try {
    const {trainingId} = req.params;
    const deletedExpense = await Training.findByIdAndDelete(trainingId);

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    const userId = req.user?._id;
    const cacheKey = `training_${userId}`;
    cache.del(cacheKey);

    res.status(200).json({
      success: true,
      message: "Training delete successfully",
    })
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating training",
    });
  }
};
