import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/FileUpload.js";

const registerUser = asyncHandler(async (req, res) => {
    const {fullName, email,username, password} = req.body

    if([fullName, email,username, password].some((field)=>field?.trim == "")){
        throw new ApiError("All fields are required",400)
    }

 const existingUser =  User.findOne({
    $or:[{email}, {username}]
   })

   if(existingUser){
    throw new ApiError("User already exists",409)
   }
const avatarLocalpath = req.files?.avatar[0]?.path ;

const coverImageLocalpath = req.files?.coverImage[0]?.path ;
if(!avatarLocalpath){
    throw new ApiError("Avatar is required",400)
}

const avatar = await uploadOnCloudinary(avatarLocalpath)
const coverImage = await uploadOnCloudinary(coverImageLocalpath)
  
if(!avatar){
    throw new ApiError("Error uploading avatar",500)
}
const user =  User.create({
    fullName,
    email,
    username,
    password,
    avatar:avatar.url,
    coverImage: coverImage ? coverImage.url : ""
})

const createdUser = await user.findById(user._id).select(
    "-password -refreshToken -_id"
)
if(!createdUser){
    throw new ApiError("Error creating user",500)
}

return res.status(201).json(
    new ApiResponse(200,createdUser,"User created successfully",true)
)

});

export {registerUser}