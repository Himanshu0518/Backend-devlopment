import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/FileUpload.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {

    const {fullName, email,username, password} = req.body
   

    if([fullName, email,username, password].some((field)=>field?.trim() == "")){
        throw new ApiError("All fields are required",400)
    }
   
  console.log("Register route hit with data:", fullName, email, username);

 const existingUser = await User.findOne({
    $or:[{email}, {username}]
   })
    
   if(existingUser){
    throw new ApiError("User already exists",409)
   }
  
const avatarLocalpath = req.files?.avatar[0]?.path ;

const coverImageLocalpath = req.files?.coverImage?coverImage[0]?.path : null;

if(!avatarLocalpath){
    throw new ApiError("Avatar is required",400)
}

const avatar = await uploadOnCloudinary(avatarLocalpath)
const coverImage = null;
if(coverImageLocalpath){
  coverImage = await uploadOnCloudinary(coverImageLocalpath)
}

  

if(!avatar){
    throw new ApiError("Error uploading avatar",500)
}

const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar:avatar.url,
    coverImage: coverImage ? coverImage.url : ""
})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser){
    throw new ApiError("Error creating user",500)
}

return res.status(201).json(
    new ApiResponse(createdUser,"User created successfully",true,201)
)

});

const loginUser = asyncHandler(async (req, res) => {
 //   console.log("Login route hit", req.body);
    const {email, password} = req.body
    console.log("credentials: ",email, password)

    if([email,password].some((field)=>field?.trim() == "")){
        throw new ApiError("All fields are required",400)
    }

    const user = await User.findOne({email})
    if(!user){
        throw new ApiError("Invalid email or password",401)
    }
    
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError("Invalid email or password",401)
    }

     try{
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()
        
        console.log("User found: ", user);
        user.refreshToken = refreshToken 
        await user.save({validateBeforeSave:false})
        
        const loggedUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )

      //  console.log("Logged user: ", loggedUser);

        if(!loggedUser){
            throw new ApiError("some Error occured during logging in",500)
        }
        const options = {
            httpOnly:true,
            secure:true,
        }

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

        
     }catch(error){
  // console.error("Login error:", error);
   throw new ApiError(error.message || "Error logging in",500)
}
});

const logoutUser = asyncHandler(async (req, res) => {
    const user_id = req.user._id;

    const user = await User.findById(user_id);
    if(!user){
        throw new ApiError("User not found",404)
    }
    user.refreshToken = null;
    await user.save({validateBeforeSave:false});
    const options = {
        httpOnly:true,
        secure:true,
    }

  return res
  .status(200)
  .clearCookie("refreshToken", options)
  .clearCookie("accessToken", options)
  .json(new ApiResponse(null, "User logged out successfully", true, 200));


});

const RefreshAccessToken = asyncHandler(async (req, res) => {

    
    try{
        const refreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ","")
    if(!refreshToken){
        throw new ApiError("Refresh token not found",401)
    }
    console.log("Refresh token: ", refreshToken)

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    console.log("Decoded refresh token: ", decoded)
    if(!decoded ){
        throw new ApiError("Invalid refresh token",401)
    }
    const user = await User.findById(decoded._id)
   
    if(!user || user.refreshToken !== refreshToken){
        throw new ApiError("Invalid refresh token",401)
    }
    const accessToken = await user.generateAccessToken()
    if(!accessToken){
        throw new ApiError("Error generating access token",500)
    }
    const refreshTokenNew = await user.generateRefreshToken()
    if(!refreshTokenNew){
        throw new ApiError("Error generating refresh token",500)
    }
    user.refreshToken = refreshTokenNew
    await user.save({validateBeforeSave:false})
    const options = {
        httpOnly:true,
        secure:true,
    }

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
    }catch(error){
        throw new ApiError(error.message || "Error refreshing access token",500)
    }
});
export {registerUser, loginUser, logoutUser, RefreshAccessToken};