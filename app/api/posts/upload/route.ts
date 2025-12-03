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
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nexus/posts",
          public_id: `${user.sub}-post-${Date.now()}`,
          resource_type: "image",
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

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id }, { status: 200 })
  } catch (error) {
    console.error("Cloudinary upload failed:", error)
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 })
  }
}



