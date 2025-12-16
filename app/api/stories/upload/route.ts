import { NextRequest, NextResponse } from "next/server"
import cloudinary from "@/lib/cloudinary"
import { getUserFromRequest } from "@/lib/auth"
import type { UploadApiOptions, UploadApiResponse } from "cloudinary"

export const dynamic = "force-dynamic"
// Increase timeout for Vercel (videos take longer, max 60s for Pro, 10s for Hobby)
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check Cloudinary configuration before processing
  const cloudinaryConfig = cloudinary.config()
  if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    console.error("Cloudinary configuration missing:", {
      hasCloudName: !!cloudinaryConfig.cloud_name,
      hasApiKey: !!cloudinaryConfig.api_key,
      hasApiSecret: !!cloudinaryConfig.api_secret,
      env: process.env.NODE_ENV,
    })
    return NextResponse.json(
      { 
        error: "Cloudinary is not configured",
        details: "Missing environment variables. Please check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel settings."
      },
      { status: 500 }
    )
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const isVideo = file.type.startsWith("video/")

  // Check file size (limit to 100MB for videos, 10MB for images - same as shorts)
  const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${isVideo ? "100MB" : "10MB"}.` },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  console.log("Starting upload process:", {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    isVideo,
    bufferLength: buffer.length
  })

  try {
    // Use uploader.upload with buffer for better error handling
    // Convert buffer to data URI format that Cloudinary accepts
    let dataUri;
    try {
      dataUri = `data:${file.type || (isVideo ? "video/mp4" : "image/jpeg")};base64,${buffer.toString("base64")}`
      console.log("Data URI created successfully, length:", dataUri.length)
      
      // Check if data URI is too large (Node.js has string length limits)
      if (dataUri.length > 50 * 1024 * 1024) { // 50MB limit for data URI
        throw new Error("File too large for processing")
      }
    } catch (dataUriError) {
      console.error("Failed to create data URI:", dataUriError)
      throw new Error("Failed to process file data")
    }
    
    const uploadOptions: UploadApiOptions = {
      folder: "nexus/stories",
      public_id: `${user.sub}-story-${Date.now()}`,
      resource_type: isVideo ? "video" : "image",
      overwrite: false,
      invalidate: true,
    }
    
    console.log("Upload options:", uploadOptions)
    
    let uploadResult: UploadApiResponse;
    
    // Try upload_stream for videos as it might work better
    if (isVideo) {
      console.log("Using upload_stream for video")
      uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error("Upload stream error:", error)
              reject(error)
            } else if (result) {
              resolve(result)
            } else {
              reject(new Error("No result from upload stream"))
            }
          }
        )
        
        uploadStream.end(buffer)
      })
    } else {
      console.log("Using regular upload for image")
      uploadResult = await cloudinary.uploader.upload(dataUri, uploadOptions)
    }
    
    console.log("Upload completed successfully:", {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    })

    if (!uploadResult || !uploadResult.secure_url) {
      console.error("Cloudinary upload returned invalid result:", uploadResult)
      return NextResponse.json(
        { 
          error: "File upload failed",
          details: "Invalid response from Cloudinary",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id }, { status: 200 })
  } catch (error: any) {
    // Enhanced error logging for Cloudinary errors
    console.error("Story upload failed:", {
      error: error?.message || String(error),
      http_code: error?.http_code,
      name: error?.name,
      stack: error?.stack,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
      cloudName: cloudinaryConfig.cloud_name,
      hasApiKey: !!cloudinaryConfig.api_key,
      hasApiSecret: !!cloudinaryConfig.api_secret,
    })
    
    // Provide more specific error messages
    let errorMessage = "File upload failed"
    let statusCode = 500

    if (error?.http_code === 401 || error?.message?.includes("401")) {
      errorMessage = "Invalid Cloudinary credentials. Please check your API key and secret."
      statusCode = 500
    } else if (error?.http_code === 400 || error?.message?.includes("400")) {
      errorMessage = "Invalid upload request. Please check the file format and size."
      statusCode = 400
    } else if (error?.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { 
        error: "File upload failed",
        details: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          debug: {
            http_code: error?.http_code,
            name: error?.name,
          }
        })
      },
      { status: statusCode }
    )
  }
}

