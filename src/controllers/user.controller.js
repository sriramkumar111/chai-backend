import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary}  from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        //save in the db
        await user.save({ validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generation refresh and access token")
    }
}

const registerUser = asyncHandler ( async (req, res) =>{
  //get user details from frontend
  //validation -- not empty
  //check if user already exists: username, email
  //check for images, check for avatar
  //upload them to cloudinary , avatar
  //create user object - create entry in db
  //remove password and refresh token filed from response
  //check for user creation
  //retun respomnse

  const {fullName, email, username, password }= req.body
 // console.log("email: ", email);
  //console.log(req.body)
  //validataion

  if (
       [fullName, email, username, password].some((field) => 
        field?.trim() === "")
        
    )
    {
        throw new ApiError(400, "All fileds are required")
    }

    //check if user aleready exists

    const existedUser = await User.findOne({
        $or: [ { username }, { email}]
    })

    if(existedUser) {
        throw new ApiError (409, "User with email or username already exists ")
    }
    //console.log(req.files);
    //check for images, check for avatars

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImagef) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    //upload them on cloudinary, avatar

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    //create userobject and create entry in db

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //remove password and refresh token filed from response & check user
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered Successfully")
    )
 
    

})

const loginUser = asyncHandler( async (req, res) => {
    //req -> body data
    //username or email
    //find user
    //password check
    //access and refresh token
    //send cookie

    //req-> body data

    const {email, username, password} = req.body
    //console.log(email);

//   if(!username && !email){
//         throw new ApiError(400,"username or email is required")
//     }

    //here is alternative way of above code discussed

    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    //find user
   const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User doesn't exist")
    }

    //password checker

     const isPasswordValid = await user.isPasswordCorrect(password)
    
     if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    //access and refresh token
   const {accessToken,refreshToken } = await generateAccessAndRefereshTokens(user._id)

   //send cookie
  
   const loggedInUser = await User.findById(user._id).
   select("-password -refreshToken")

   //options for cookies for security purpose
   const options = {
        httpOnly : true,
        secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "User logged in succesfully"
        )
   )
    
})

const logoutUser = asyncHandler( async (req,res) => {
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    //clear the cookies 
    const options = {
        httpOnly : true,
        secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out"))


})

// refreshtoken ka end point banana hai
const refreshAccessToken = asyncHandler(async (req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    //verify incoming token

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET
     )
      
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401, "Invalid refresh token")
     }
 
     //matching the incoming accesstoken  and token present in user
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or used ")
     }
 
     //yahan tak aa gaye hai yaani sara verifiation check ho gaya hai so naya refresh token 
     //generate karke de dete hain
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const {accessToken,newRefreshToken } = await generateAccessAndRefereshTokens
     (user._id)
 
     return res
     .status(200)
     .cookie("accessToken", accessToken , options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new ApiResponse(200,
             {accessToken,refreshToken : newRefreshToken},
             "Access token refreshed"
             
         )
     )
   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    
   }

})
//commment


export {registerUser,loginUser,logoutUser,refreshAccessToken}