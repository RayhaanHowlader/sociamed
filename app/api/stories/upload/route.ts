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
  const type = formData.get("type") as string | null // "image" or "video"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!cloudinary.config().cloud_name) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const isVideo = type === "video" || file.type.startsWith("video/")

  try {
    const result = await new Promise<{
      secure_url: string
      public_id: string
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nexus/stories",
          public_id: `${user.sub}-story-${Date.now()}`,
          resource_type: isVideo ? "video" : "image",
          ...(isVideo && {
            eager: [{ quality: "auto", fetch_format: "auto" }],
          }),
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
        type: isVideo ? "video" : "image",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Cloudinary upload failed:", error)
    return NextResponse.json({ error: "File upload failed" }, { status: 500 })
  }
}

