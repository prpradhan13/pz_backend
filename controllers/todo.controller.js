import Todo from "../models/todo.model.js";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 600 });
const cacheKey = "todoDataCache";

export const createTodo = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { title, dueDate, completed, priority, tasks } = req.body;

    const savedTodo = await Todo.create({
      userId,
      title,
      dueDate,
      completed,
      priority,
      tasks,
    });

    // Check if cacheKey exists and then delete the cache
    if (cache && cacheKey) {
      cache.del(cacheKey);
    }

    res.status(201).json({
      success: true,
      message: "Todo saved successfully",
      savedTodo,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating todo",
      error: error.message,
    });
  }
};

export const getTodo = async (req, res) => {
  try {
    const userId = req?.user?._id;
    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log("Serving Todo from cache");
      return res.status(200).json({
        success: true,
        message: "Todos retrieved from cache successfully",
        todos: cache.get(cacheKey),
      });
    }

    const todos = await Todo.find({ userId });

    cache.set(cacheKey, todos);

    res.status(200).json({
      success: true,
      message: `total ${todos?.length} todos`,
      todos,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while getting todo",
      error: error.message,
    });
  }
};

export const updateTodo = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { title, dueDate, priority, tasks } = req.body;

    if (!title && !dueDate && !priority && (!tasks || tasks.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    // Prepare update fields
    const updateFields = {};

    // Only add the fields that are provided
    if (title) updateFields.title = title;
    if (dueDate) updateFields.dueDate = dueDate;
    if (priority) updateFields.priority = priority;

    // If tasks are provided, handle the addition of new tasks
    if (tasks && tasks.length > 0) {
      updateFields.$push = { tasks: { $each: tasks } };
    }

    // Update the todo item
    const updatedTodo = await Todo.findByIdAndUpdate(todoId, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedTodo) {
      return res.status(404).json({
        success: false,
        message: "Todo not found",
      });
    }

    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      todoData: updatedTodo,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating todo",
      error: error.message,
    });
  }
};

export const updateTodoTask = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { taskId, taskTitle, completed } = req.body;

    console.log("Incoming data:", { todoId, taskId, taskTitle, completed });

    // Check if taskId and either taskTitle or completed status are provided
    if (!taskId || (!taskTitle && completed === undefined)) {
      return res.status(400).json({
        success: false,
        message:
          "Task ID and at least one field (taskTitle or completed) are required",
      });
    }

    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: todoId, "tasks._id": taskId },
      {
        $set: {
          ...(taskTitle && { "tasks.$.tasktitle": taskTitle }),
          ...(completed !== undefined && { "tasks.$.completed": completed }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({
        success: false,
        message: "Todo or task not found",
      });
    }

    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      todoData: updatedTodo,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating task",
      error: error.message,
    });
  }
};

export const deleteTodo = async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.todoId);

    cache.del(cacheKey);

    res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while deleting todo",
      error: error.message,
    });
  }
};
