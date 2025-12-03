import { NextRequest, NextResponse } from "next/server"
import cloudinary from "@/lib/cloudinary"
import { getUserFromRequest } from "@/lib/auth"

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

  if (!cloudinary.config().cloud_name) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await new Promise<{
      secure_url: string
      public_id: string
      resource_type: string
      format?: string
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nexus/chat",
          public_id: `${user.sub}-chat-${Date.now()}`,
          resource_type: "auto",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"))
            return
          }
          resolve(uploadResult as any)
        },
      )

      stream.end(buffer)
    })

    const originalName = file.name
    const mimeType = file.type || "application/octet-stream"
    const isImage = mimeType.startsWith("image/")

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: originalName,
        mimeType,
        isImage,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Chat file upload failed:", error)
    return NextResponse.json({ error: "File upload failed" }, { status: 500 })
  }
}


