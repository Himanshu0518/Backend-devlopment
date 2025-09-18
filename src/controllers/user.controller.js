import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/FileUpload.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new ApiError("All fields are required", 400);
  }

  console.log("Register route hit with data:", fullName, email, username);

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError("User already exists", 409);
  }

  const avatarLocalpath = req.files?.avatar[0]?.path;

  const coverImageLocalpath = req.files?.coverImage
    ? coverImage[0]?.path
    : null;

  if (!avatarLocalpath) {
    throw new ApiError("Avatar is required", 400);
  }

  const avatar = await uploadOnCloudinary(avatarLocalpath);
  const coverImage = null;
  if (coverImageLocalpath) {
    coverImage = await uploadOnCloudinary(coverImageLocalpath);
  }

  if (!avatar) {
    throw new ApiError("Error uploading avatar", 500);
  }

  const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.url,
    coverImage: coverImage ? coverImage.url : "",
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError("Error creating user", 500);
  }

  return res
    .status(201)
    .json(new ApiResponse(createdUser, "User created successfully", true, 201));
});

const loginUser = asyncHandler(async (req, res) => {
  //   console.log("Login route hit", req.body);
  const { email, password } = req.body;
  console.log("credentials: ", email, password);

  if ([email, password].some((field) => field?.trim() == "")) {
    throw new ApiError("All fields are required", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError("Invalid email or password", 401);
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError("Invalid email or password", 401);
  }

  try {
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    console.log("User found: ", user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    //  console.log("Logged user: ", loggedUser);

    if (!loggedUser) {
      throw new ApiError("some Error occured during logging in", 500);
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          { user: loggedUser, accessToken, refreshToken },
          "User logged in successfully",
          true,
          200
        )
      );
  } catch (error) {
    // console.error("Login error:", error);
    throw new ApiError(error.message || "Error logging in", 500);
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  const user_id = req.user._id;

  const user = await User.findById(user_id);
  if (!user) {
    throw new ApiError("User not found", 404);
  }
  user.refreshToken = null;
  await user.save({ validateBeforeSave: false });
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(null, "User logged out successfully", true, 200));
});

const RefreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!refreshToken) {
      throw new ApiError("Refresh token not found", 401);
    }
    console.log("Refresh token: ", refreshToken);

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log("Decoded refresh token: ", decoded);
    if (!decoded) {
      throw new ApiError("Invalid refresh token", 401);
    }
    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError("Invalid refresh token", 401);
    }
    const accessToken = await user.generateAccessToken();
    if (!accessToken) {
      throw new ApiError("Error generating access token", 500);
    }
    const refreshTokenNew = await user.generateRefreshToken();
    if (!refreshTokenNew) {
      throw new ApiError("Error generating refresh token", 500);
    }
    user.refreshToken = refreshTokenNew;
    await user.save({ validateBeforeSave: false });
    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("refreshToken", refreshTokenNew, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          { accessToken, refreshToken: refreshTokenNew },
          "Access token refreshed successfully",
          true,
          200
        )
      );
  } catch (error) {
    throw new ApiError(error.message || "Error refreshing access token", 500);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user_id = req.user._id;

    const user = await User.findById(user_id);

    if (!user) {
      throw new ApiError("User not found", 404);
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError("Old password is incorrect", 400);
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
    return res
      .status(200)
      .json(new ApiResponse(null, "Password changed successfully", true, 200));
  } catch (error) {
    throw new ApiError(error.message || "Error changing password", 500);
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    const user_id = req.user._id;
    const user = await User.findById(user_id).select("-password -refreshToken");
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    return res
      .status(200)
      .json(new ApiResponse(user, "User found successfully", true, 200));
  } catch (error) {
    throw new ApiError(error.message || "Error fetching user", 500);
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const user_id = req.user._id;

    if (!fullName?.trim() && !email?.trim()) {
      throw new ApiError("At least one field is required to update", 400);
    }
    const user = await User.findByIdAndUpdate(
      user_id,
      {
        $set: {
          fullName: fullName.trim() ? fullName : user.fullName,
          email: email.trim() ? email : user.email,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(
        new ApiResponse(user, "User profile updated successfully", true, 200)
      );
  } catch (error) {
    throw new ApiError(error.message || "Error updating profile", 500);
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  try {
    const user_id = req.user._id;
    const avatarLocalpath = req.files?.path ;

    if (!avatarLocalpath) {
        throw new ApiError("Avatar is required", 400);
      }
    
    const avatar =  await uploadOnCloudinary(avatarLocalpath);
    
    if (!avatar.url) {
        throw new ApiError("Error uploading avatar", 500);
      }

    await User.findByIdAndUpdate(
        user_id,
        {
        $set:{
            avatar: avatar.url,
            }
        }
       , { new: true }
    )

    return res
      .status(200)
      .json(
        new ApiResponse({ avatar }, "User avatar updated successfully", true, 200)
      );

  } catch (error) {
    throw new ApiError(error.message || "Error updating avatar", 500);
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError("Username is required", 400);
      }

      const channel = await User.aggregate([
        {
         $match: { username: username }
       },
       {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"channel",
          as:"subscribers"
        }
       },
       {
        $lookup:{
          from:"subscriptions",
          localField:"_id",
          foreignField:"subscriber",
          as:"subscriptions"
        }
       },
       {
        $addFields:{
          subscribersCount: { $size: "$subscribers" },
          subscriptionsCount: { $size: "$subscriptions" },
          isSubscribed: { 
            $cond:{
              if: { $in: [req.user._id, "$subscribers.subscriber"] },
              then: true,
              else: false
            }
          }
        },
        
       },
     {
        $project: {
         fullName: 1,
         username: 1,
         email: 1,
         avatar: 1,
         coverImage: 1,
         subscribersCount: 1,
         subscriptionsCount: 1,
        isSubscribed: 1,
          
        }
       },
     
       
    ])

    if(!channel || channel.length === 0){
        throw new ApiError("Channel not found", 404);
    }
    return res
    .status(200)
    .json(
      new ApiResponse(channel[0], "Channel profile fetched successfully", true, 200)
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  
 const history = await User
                .aggregate([
                  {
                 $match: { _id: new mongoose.Types.ObjectId(req.user._id) },

                  },
                  {
                    $lookup:{
                      from:"videos",
                      localField:"watchHistory",  
                      foreignField:"_id",
                      as:"watchHistory",
                        // now i have array of video objects
                  // every video has a owner field -> ref to user

                      pipeline:[
                        {
                          $lookup:{
                            from :"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                              {
                                $project:{
                                  fullName:1,
                                  username:1,
                                  avatar:1
                                }
                              },
                              {
                                $addFields:{
                                  owner: { $first: "$owner"}
                                }
                              }
                            ]
                          }
                        }
                      ]
                  }
                
                }
              
            ])


        return res
        .status(200)
        .json(
          new ApiResponse(history[0].watchHistory, "Watch history fetched successfully", true, 200)
        );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  RefreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserProfile,
  getUserChannelProfile,
  updateAvatar,
  getWatchHistory
};
