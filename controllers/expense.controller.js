import Expense from "../models/expense.model.js";
import NodeCache from 'node-cache';

// Initialize the cache with a default TTL of 600 seconds (10 minutes)
const cache = new NodeCache({ stdTTL: 600 });
const cacheKey = "expenses";

export const createExpense = async (req, res) => {
  try {
    const expensesData = req.body;

    // 1. Check if data is an array or a single object
    if (!Array.isArray(expensesData)) {
      // Handle a single expense
      const { item, price, category, date } = expensesData;

      // Check required fields
      if (!item || !price || !category) {
        return res.status(400).json({
          success: false,
          message: "All fields (item, price, category) are required",
        });
      }

      const expense = await Expense.create({
        userId: req.user?._id,
        item: item.toLowerCase(),
        price,
        category: category.toLowerCase(),
        date: date ? new Date(date) : new Date(),
      });

      return res.status(200).json({
        success: true,
        message: "Expense created successfully",
        expense,
      });
    }

    // Handle multiple expenses
    const formattedExpenses = expensesData.map((exp) => ({
      userId: req.user?._id,
      item: exp.item,
      price: exp.price,
      category: exp.category,
      date: exp.date ? new Date(exp.date) : new Date(),
    }));

    // Validate if required fields are present in every expense object
    for (let exp of formattedExpenses) {
      if (!exp.item || !exp.price || !exp.category) {
        return res.status(400).json({
          success: false,
          message:
            "All fields (item, price, category) are required for every expense",
        });
      }
    }

    // Bulk create all expenses
    const createdExpenses = await Expense.insertMany(formattedExpenses);

    // Cache the created expenses using the user ID as part of the cache key
    cache.del(cacheKey);

    // Send Response
    return res.status(200).json({
      success: true,
      message: "Expenses created successfully",
      expenses: createdExpenses,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while creating Expense",
      error: error.message,
    });
  }
};

// Get all expense of one User by userId
export const userAllExpenses = async (req, res) => {
  try {
    // 1. Get user ID from req.user
    const userId = req.user?._id;

    // 2. Optional query parameters for pagination and sorting
    // const { limit = 10, page = 1, sortBy = "date", order = "desc" } = req.query;
    const { limit , page , sortBy = "date", order = "desc" } = req.query;

    // 4. Check if the data is already in the cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log("Serving from cache");
      return res.status(200).json({
        success: true,
        message: "Expenses retrieved from cache successfully",
        expenseData: cache.get(cacheKey),
      });
    }

    // 5. Convert to numbers for use in pagination
    const limitNumber = parseInt(limit);
    const skip = (parseInt(page) - 1) * limitNumber;

    // 6. Query the Expense collection for all expenses of this user
    const expenses = await Expense.find({ userId })
      .select("-userId -createdAt -updatedAt -__v")
      .sort({ [sortBy]: order === "desc" ? 1 : -1 }) // Sorting by date or other fields
      .skip(skip) // Pagination: skip first (page-1) * limit
      .limit(limitNumber);

    // 7. If no expenses found, return a message
    if (!expenses || expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No expenses found for this user",
      });
    }

    // 8. Store the retrieved data in the cache
    cache.set(cacheKey, expenses);

    // 9. Return the found expenses
    res.status(200).json({
      success: true,
      message: "Expenses retrieved successfully",
      userId,
      totalExpense: expenses.length,
      expenseData: expenses,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while getting all Expense",
      error: error.message,
    });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { item, price, category, date } = req.body;

    if (!item && !price && !category && !date) {
      return res.status(400).json({
        success: false,
        message:
          "At least one field (item, price, category, or date) is required to update",
      });
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      {
        $set: {
          ...(item && { item }),
          ...(price && { price }),
          ...(category && { category }),
          ...(date && { date: new Date(date) }),
          /* 
            1. The ... (spread operator) is used to include the object into the larger update object if the field is provided.
            2. item && { item }: This checks if item is present in the request body. 
              If item exists (i.e., the user has provided an item), it creates an object { item: item }. 
              If item is not provided, it returns false, and nothing happens.
              Example: If item is "Dinner", this becomes { item: "Dinner" }. 
          */
          /*
            The date is a little special. 
            If the user provides a date, it converts the date string into a proper JavaScript Date object (new Date(date)) before saving it.
          */
        },
      },
      { new: true, runValidators: true } // "runValidators: true"  it ensures that the validators defined in schema will also be applied when updating documents.
    );

    if (!updatedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating an Expense",
      error: error.message,
    });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const deletedExpense = await Expense.findByIdAndDelete(expenseId);

    if (!deletedExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    cache.del(cacheKey);

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating an Expense",
      error: error.message,
    });
  }
};
