import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config()

// Create a transporter object using your email provider's SMTP settings
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,  // Your email
    pass: process.env.EMAIL_PASSWORD,  // Your email app password
  },
});

// Generate Access Token & Refresh Token
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Error generate Access And Refresh Token", error });
  }
};

// Function to send verification email
const sendVerificationEmail = async (user, req) => {
  const verificationToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.EMAIL_VERIFICATION_SECRET,
    { expiresIn: "1h" }
  );

  const verificationLink = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/user/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Email Verification",
    text: `Please verify your email by clicking the following link: ${verificationLink}`,
    html: `<a href="${verificationLink}">Verify your email</a>`,
  }

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  })
};

export const signupController = async (req, res) => {
  try {
    const { username, fullname, email, password } = req.body;

    // 1. Validate user input
    if (
      [username, fullname, email, password].some(
        (fields) => fields?.trim() === ""
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (username.length < 5 || fullname.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Username and full name must be at least 5 characters long.",
      });
    }

    const usernameRegex = /^[A-Za-z]+$/;  // Username: only letters
    const alphabetRegex = /^[A-Za-z\s]+$/; // Fullname: letters and spaces
    if (!alphabetRegex.test(fullname)) {
      return res.status(400).json({
        success: false,
        message: "Full name must only contain letters (no numbers or special characters).",
      });
    }

    // Password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#!$^&*])[A-Za-z\d@#!]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).send({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character (@, #, !, $, ^, &, *).",
      });
    }

    // 2. Check if the user already exists
    const existingUser = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.username === username
            ? "Username is already taken"
            : "Email is already registered",
      });
    }

    // 3. Save the user to the database
    const savedUser = await User.create({
      username: username.toLowerCase(),
      fullname: fullname.toLowerCase(),
      email,
      password,
    });

    // 4. Created the user send in response
    const createdUser = await User.findById(savedUser._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong while registering the user",
      });
    }

    // Send verification email
    await sendVerificationEmail(savedUser, req);

    // 5. Send response
    return res.status(200).json({
      success: true,
      message: `Signup successful! Please check your email (${email}) to verify your account.`,
      createdUser,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Signup controller failed",
      error: error.message,
    });
  }
};

export const verifyEmailController = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    // Mark the user email as verified
    user.isEmailVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
      error: error.message,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    // 1. Data from body
    const { username, password } = req.body;

    // 2. Check all fields are filled
    if (!username && !password) {
      return res
        .status(404)
        .json({ success: false, message: "All fields are required" });
    }

    // 3. Find by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Can't find user",
      });
    }

    // 4. Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    // 4. Check password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid user credentials",
      });
    }

    // 5. Access Token and Refresh Token generate by 'generateAccessAndRefreshToken(give_userId)'
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV,
      sameSite: "None",
      maxAge: 48 * 60 * 60 * 1000, // Cookie will last for 2 day
    };

    // 6. Send Response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: `Welcome ${username}`,
        user: loggedInUser,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Login controller failed",
      error: error.message,
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    // 1. Check if the user is authenticated and req.user exists
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    // 2. Find the user
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: null } },
      { new: true }
    );

    // 3. Set cookie options
    const options = {
      httpOnly: true,
      secure: true,
    };

    // 4. Send the Response
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        success: true,
        message: "Logout successful",
      });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Something went wrong while logging out",
      error: error.message,
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const inComingRefreshToken = req.cookies.refreshToken;
    if (!inComingRefreshToken) {
      return res
        .status(404)
        .send({ success: false, message: "Unauthorized access" });
    }

    const decodedToken = jwt.verify(
      inComingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      return res
        .status(404)
        .send({ success: false, message: "Invalid refresh token" });
    }

    if (inComingRefreshToken !== user?.refreshToken) {
      return res
        .status(401)
        .send({ success: false, message: "Refresh token expired or used" });
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        accessToken,
        refreshToken,
        success: true,
        message: "Access token refreshed successfully",
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong in while refreshing access token",
    });
  }
};

export const changeCurrentPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword && !newPassword) {
      return res
        .status(404)
        .json({ success: false, message: "All fields are required" });
    }

    const user = await User.findById(req.user?._id);
    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isOldPasswordCorrect) {
      return res
        .status(404)
        .json({ success: false, message: "Old password incorrect" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#!$^&*])[A-Za-z\d@#!]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).send({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character (@, #, !, $, ^, &, *).",
      });
    }

    user.password = newPassword;
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });

    // Send email to notify the user
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,  // Send to user's email
      subject: "Password Change Notification",
      text: `Hello ${user.fullname},\n\nYour password has been successfully changed. If this wasn't you, please contact immediately.\n\nBest regards,\nPZ Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error sending email:", error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        success: true,
        message: "Password changed successfully Logged in again",
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Something went wrong in while refreshing access token",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Current user fetched successfully",
    user: req.user,
  });
};

export const changeUserDetails = async (req, res) => {
  try {
    const { username, fullname, email } = req.body;
    if (!username || !fullname || !email) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          username,
          fullname,
          email,
        },
      },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "User details successfully updated",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while updating user details",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user?._id)

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      success: true,
      message: "Account Delete successful"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error while deleting user"
    });
  }
};
