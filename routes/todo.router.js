import express from "express";
import { verifyJWT } from "../middlewares/user.middleware.js";
import {
  createTodo,
  deleteTodo,
  deleteTodoTask,
  getTodo,
  updateTodo,
  updateTodoTask,
} from "../controllers/todo.controller.js";

const router = express.Router();

router.route("/").post(verifyJWT, createTodo).get(verifyJWT, getTodo);

router
  .route("/:todoId")
  .put(verifyJWT, updateTodo)
  .patch(verifyJWT, updateTodoTask)
  .delete(verifyJWT, deleteTodo);

router.route("/task/:taskId").delete(verifyJWT, deleteTodoTask);

export default router;
