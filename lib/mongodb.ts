import { MongoClient } from "mongodb"

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

if (process.env.NODE_ENV === "development") {
  // In development, reuse the client across HMR reloads to avoid creating too many connections.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalWithMongo = global as any

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  client = new MongoClient(uri)
  clientPromise = client.connect()
}

export async function getDb() {
  const connectedClient = await clientPromise
  return connectedClient.db(dbName)
}


