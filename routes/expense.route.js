import express from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  userAllExpenses,
} from "../controllers/expense.controller.js";

const router = express.Router();

router
  .route("/")
  .post(verifyJWT, createExpense)
  .get(verifyJWT, userAllExpenses);

router
  .route("/:expenseId")
  .put(verifyJWT, updateExpense)
  .delete(verifyJWT, deleteExpense);

export default router;
