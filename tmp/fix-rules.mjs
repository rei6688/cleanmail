import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("No MONGODB_URI found in .env.local");
        return;
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(); // Lấy db mặc định từ URI
        const collection = db.collection('rules');

        console.log("--- START FIXING RULE ---");

        // Fix Rule cụ thể của VIB
        const result = await collection.updateOne(
            { _id: new ObjectId("69a159b77490d334acf07224") },
            {
                $set: {
                    "retentionDays": 0,
                    "conditions.readFilter": "any",
                    "conditions.bodyKeywords": []
                }
            }
        );

        console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        console.log("--- SUCCESS ---");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

run();
