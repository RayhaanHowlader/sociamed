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
  const imageType = formData.get("imageType") as string | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Check file size (limit to 10MB for images)
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
    const result = await new Promise<{
      secure_url: string
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nexus/profiles",
          public_id: `${user.sub}-${imageType || "image"}-${Date.now()}`,
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            console.error("Cloudinary upload error:", {
              message: error.message,
              http_code: error.http_code,
              name: error.name,
            })
            reject(error)
            return
          }
          if (!uploadResult) {
            reject(new Error("Cloudinary upload failed: No result returned"))
            return
          }
          resolve(uploadResult as { secure_url: string })
        },
      )

      stream.on("error", (streamError) => {
        console.error("Cloudinary stream error:", streamError)
        reject(streamError)
      })

      stream.end(buffer)
    })

    return NextResponse.json({ url: result.secure_url }, { status: 200 })
  } catch (error) {
    console.error("Cloudinary upload failed:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fileSize: file.size,
      fileName: file.name,
      fileType: file.type,
    })
    
    const errorMessage = error instanceof Error ? error.message : "Image upload failed"
    return NextResponse.json(
      { 
        error: "Image upload failed",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
}


