import express from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import {
  createTraining,
  getTraining,
  deleteTraining
} from "../controllers/training.controller.js";

const router = express.Router();

router.route("/").post(verifyJWT, createTraining).get(verifyJWT, getTraining);

router.route("/:trainingId").delete(verifyJWT, deleteTraining)

export default router;
