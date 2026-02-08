import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { getUserFromRequest } from "@/lib/auth"
import cloudinary from "@/lib/cloudinary"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const posts = db.collection("posts")
  const users = db.collection("users")

  const _id = new ObjectId(params.id)
  
  // Find the post
  const post = await posts.findOne({ _id })
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  // Get author information
  const author = await users.findOne(
    { _id: new ObjectId(post.userId) },
    { projection: { name: 1, username: 1, avatarUrl: 1 } }
  )

  if (!author) {
    return NextResponse.json({ error: "Author not found" }, { status: 404 })
  }

  // Get like status for current user
  const likes = db.collection("likes")
  const userLike = await likes.findOne({
    postId: post._id.toString(),
    userId: user.sub,
  })

  // Get stats
  const [likesCount, commentsCount, sharesCount] = await Promise.all([
    likes.countDocuments({ postId: post._id.toString() }),
    db.collection("comments").countDocuments({ postId: post._id.toString() }),
    db.collection("shares").countDocuments({ postId: post._id.toString() }),
  ])

  const postWithDetails = {
    ...post,
    author: {
      name: author.name,
      username: author.username,
      avatarUrl: author.avatarUrl,
    },
    liked: !!userLike,
    stats: {
      likes: likesCount,
      comments: commentsCount,
      shares: sharesCount,
    },
  }

  return NextResponse.json({ post: postWithDetails }, { status: 200 })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { content } = (await req.json()) as { content?: string }

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content cannot be empty" }, { status: 400 })
  }

  const db = await getDb()
  const posts = db.collection("posts")

  const _id = new ObjectId(params.id)
  const post = await posts.findOne<{ userId: string }>({ _id })
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  if (post.userId !== user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await posts.updateOne(
    { _id },
    {
      $set: {
        content: content.trim(),
        updatedAt: new Date(),
      },
    },
  )

  const updated = await posts.findOne({ _id })

  return NextResponse.json({ post: updated }, { status: 200 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const user = getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getDb()
  const posts = db.collection("posts")

  const _id = new ObjectId(params.id)
  const post = await posts.findOne<{ userId: string; imagePublicId?: string }>({ _id })

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  if (post.userId !== user.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (post.imagePublicId && cloudinary.config().cloud_name) {
    try {
      await cloudinary.uploader.destroy(post.imagePublicId)
    } catch (error) {
      console.error("Error deleting Cloudinary image:", error)
    }
  }

  await posts.deleteOne({ _id })

  return NextResponse.json({ success: true }, { status: 200 })
}


