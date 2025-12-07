import { MongoClient, MongoClientOptions } from "mongodb"

const uri = process.env.MONGO_URI
const dbName = process.env.DB_NAME

if (!uri) {
  throw new Error("MONGO_URI is not set in environment variables")
}

if (!dbName) {
  throw new Error("DB_NAME is not set in environment variables")
}

let client: MongoClient | null = null
let clientPromise: Promise<MongoClient>

// Reuse connection across requests in both development and production
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalWithMongo = global as any

if (!globalWithMongo._mongoClientPromise) {
  // MongoDB connection options optimized for serverless environments (Vercel)
  const options: MongoClientOptions = {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10000, // Increased timeout for serverless
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    // SSL/TLS options for MongoDB Atlas
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    // Retry options
    retryWrites: true,
    retryReads: true,
    // Heartbeat settings
    heartbeatFrequencyMS: 10000,
    // Direct connection for faster initial connection (if using single server)
    // For replica sets, this will be ignored
    directConnection: false,
  }

  console.log("[MONGODB] Creating MongoDB client with SSL/TLS enabled")
  client = new MongoClient(uri, options)
  
  globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
    console.error("[MONGODB] Initial connection failed:", error)
    // Reset the promise so it can be retried
    globalWithMongo._mongoClientPromise = null
    throw error
  })
}

clientPromise = globalWithMongo._mongoClientPromise

export async function getDb() {
  try {
    console.log("[MONGODB] Getting database connection...")
    const connectedClient = await clientPromise
    console.log("[MONGODB] Database connection established")
    return connectedClient.db(dbName)
  } catch (error) {
    console.error("[MONGODB] Error getting database connection:", error)
    
    // If connection failed, try to reconnect
    if (error instanceof Error && error.message.includes("SSL") || error.message.includes("TLS")) {
      console.log("[MONGODB] SSL/TLS error detected, attempting to reset connection...")
      // Reset the promise to allow reconnection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalWithMongo = global as any
      globalWithMongo._mongoClientPromise = null
      
      // Try to reconnect once
      try {
        const options: MongoClientOptions = {
          maxPoolSize: 10,
          minPoolSize: 1,
          serverSelectionTimeoutMS: 15000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 15000,
          tls: true,
          retryWrites: true,
          retryReads: true,
        }
        
        const newClient = new MongoClient(uri, options)
        globalWithMongo._mongoClientPromise = newClient.connect()
        const connectedClient = await globalWithMongo._mongoClientPromise
        console.log("[MONGODB] Reconnection successful")
        return connectedClient.db(dbName)
      } catch (retryError) {
        console.error("[MONGODB] Reconnection failed:", retryError)
        throw retryError
      }
    }
    
    throw error
  }
}


