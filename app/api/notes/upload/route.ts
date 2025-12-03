import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Check if file is an audio file
  if (!file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "File must be an audio file" }, { status: 400 })
  }

  if (!cloudinary.config().cloud_name) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await new Promise<{
      secure_url: string
      public_id: string
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nexus/notes/music",
          public_id: `${user.sub}-music-${Date.now()}`,
          resource_type: "video", // Cloudinary uses "video" resource type for audio files
          format: "mp3", // Convert to mp3 for better compatibility
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"))
            return
          }
          resolve(uploadResult as { secure_url: string; public_id: string })
        },
      )

      stream.end(buffer)
    })

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.name,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Cloudinary upload failed:", error)
    return NextResponse.json({ error: "Music upload failed" }, { status: 500 })
  }
}

