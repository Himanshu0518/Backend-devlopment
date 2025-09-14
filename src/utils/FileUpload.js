import {v2 as cloudinary} from "cloudinary"

import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });


const uploadOnCloudinary = async (localfilePath)=>{
 console.log(localfilePath)
    try{
        const uploadResult = await cloudinary.uploader
       .upload(
           localfilePath, {
               resource_type:"auto",
           } )
           
           fs.unlinkSync(localfilePath)
           return uploadResult
    }
    catch{
     fs.unlinkSync(localfilePath)
     return  null 
    }
}
  
     
export {uploadOnCloudinary} 