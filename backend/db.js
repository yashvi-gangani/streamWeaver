// this file handles connecting to mongodb, kept separate so server.js stays clean
const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = "streamweaver";

let db = null;

// call this once when the server starts
async function connectToDatabase() {
  try {
    const client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db(DB_NAME);
    console.log("Connected to MongoDB");
  } catch (err) {
    // if mongo is not running, we still let the app work, just without saving to db
    console.log("Could not connect to MongoDB, data will not be saved:", err.message);
    db = null;
  }
}

// returns the processed_data collection, or null if db is not connected
function getCollection() {
  if (!db) return null;
  return db.collection("processed_data");
}

module.exports = { connectToDatabase, getCollection };