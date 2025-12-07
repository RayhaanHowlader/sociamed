import { NextRequest, NextResponse } from "next/server"
import cloudinary from "@/lib/cloudinary"
import { getUserFromRequest } from "@/lib/auth"

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

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Check file size (limit to 10MB for post images)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    // Use uploader.upload with buffer for better error handling
    // Convert buffer to data URI format that Cloudinary accepts
    const dataUri = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`
    
    const uploadResult = await cloudinary.uploader.upload(
      dataUri,
      {
        folder: "nexus/posts",
        public_id: `${user.sub}-post-${Date.now()}`,
        resource_type: "image",
        overwrite: false,
        invalidate: true,
      }
    )

    if (!uploadResult || !uploadResult.secure_url) {
      console.error("Cloudinary upload returned invalid result:", uploadResult)
      return NextResponse.json(
        { 
          error: "Image upload failed",
          details: "Invalid response from Cloudinary",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: uploadResult.secure_url, publicId: uploadResult.public_id }, { status: 200 })
  } catch (error: any) {
    // Enhanced error logging for Cloudinary errors
    console.error("Post upload failed:", {
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
    let errorMessage = "Image upload failed"
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
        error: "Image upload failed",
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



