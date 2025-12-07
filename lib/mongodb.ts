import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI!;
const dbName = process.env.DB_NAME!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as any;
  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, {
      tls: true, // optional, Atlas uses TLS automatically
    });
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, {
    tls: true,
  });
  clientPromise = client.connect();
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
