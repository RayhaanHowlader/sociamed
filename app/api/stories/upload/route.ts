import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"

export const dynamic = "force-dynamic"
// Increase timeout for Vercel (max 60s for Pro, 10s for Hobby)
export const maxDuration = 30

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
  const type = formData.get("type") as string | null // "image" or "video"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const isVideo = type === "video" || file.type.startsWith("video/")
  
  // Check file size (limit to 50MB for videos, 10MB for images)
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB for videos, 10MB for images
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${isVideo ? "50MB" : "10MB"}.` },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    // Use uploader.upload with buffer for better error handling
    // Convert buffer to data URI format that Cloudinary accepts
    const dataUri = `data:${file.type || (isVideo ? "video/mp4" : "image/jpeg")};base64,${buffer.toString("base64")}`
    
    const uploadResult = await cloudinary.uploader.upload(
      dataUri,
      {
        folder: "nexus/stories",
        public_id: `${user.sub}-story-${Date.now()}`,
        resource_type: isVideo ? "video" : "image",
        overwrite: false,
        invalidate: true,
        ...(isVideo && {
          eager: [{ quality: "auto", fetch_format: "auto" }],
        }),
      }
    )

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

    return NextResponse.json(
      {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        type: isVideo ? "video" : "image",
      },
      { status: 200 },
    )
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
      isVideo,
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

