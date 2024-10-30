import express from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import {
  createTraining,
  getTraining,
  deleteTraining,
  allPublicTrainingData,
  updatePublicField,
} from "../controllers/training.controller.js";
import { createWeeklyTraining, getWeeklyTraining } from "../controllers/weeklyTraining.controller.js";

const router = express.Router();

router.route("/").post(verifyJWT, createTraining).get(verifyJWT, getTraining)
router.route("/public").get(verifyJWT, allPublicTrainingData);

router.route("/:trainingId").delete(verifyJWT, deleteTraining).patch(verifyJWT, updatePublicField);

router.route("/weeklyTraining").post(verifyJWT, createWeeklyTraining).get(verifyJWT, getWeeklyTraining);

export default router;
