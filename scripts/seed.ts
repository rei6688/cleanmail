#!/usr/bin/env node
/**
 * Seed script: creates demo rules for a given user.
 * Usage: MONGODB_URI=... USER_MICROSOFT_ID=... node -r ts-node/register scripts/seed.ts
 */

import mongoose from "mongoose";
import { connectDB } from "../src/infra/db/connection";
import { User } from "../src/models/user";
import { Rule } from "../src/models/rule";

const DEMO_MICROSOFT_ID =
  process.env.USER_MICROSOFT_ID ?? "demo-microsoft-id";

const demoRules = [
  {
    name: "Archive Newsletters",
    enabled: true,
    conditions: {
      senders: [],
      subjectKeywords: ["unsubscribe", "newsletter", "weekly digest"],
      excludeKeywords: [],
      readFilter: "any",
      sourceFolders: [],
    },
    targetFolder: "Archive",
    categoryAction: {
      policy: "add",
      categories: ["Newsletter"],
    },
  },
  {
    name: "Move No-reply Emails",
    enabled: true,
    conditions: {
      senders: ["noreply@", "no-reply@", "donotreply@"],
      subjectKeywords: [],
      excludeKeywords: [],
      readFilter: "any",
      sourceFolders: [],
    },
    targetFolder: "Automated",
    categoryAction: {
      policy: "replace",
      categories: ["Automated"],
    },
  },
  {
    name: "Flag Unread Promotions",
    enabled: false,
    conditions: {
      senders: [],
      subjectKeywords: ["sale", "discount", "offer", "% off"],
      excludeKeywords: ["receipt", "invoice"],
      readFilter: "unread",
      sourceFolders: [],
    },
    targetFolder: "Promotions",
    categoryAction: {
      policy: "add",
      categories: ["Promotions"],
    },
  },
];

async function seed() {
  await connectDB();

  // Find or create demo user
  let user = await User.findOne({ microsoftId: DEMO_MICROSOFT_ID });
  if (!user) {
    user = await User.create({
      microsoftId: DEMO_MICROSOFT_ID,
      email: "demo@example.com",
      name: "Demo User",
    });
    console.log("Created demo user:", user._id);
  } else {
    console.log("Found existing user:", user._id);
  }

  // Clear existing rules for this user
  await Rule.deleteMany({ userId: user._id });
  console.log("Cleared existing rules");

  // Insert demo rules
  const inserted = await Rule.insertMany(
    demoRules.map((r) => ({ ...r, userId: user._id }))
  );
  console.log(`Seeded ${inserted.length} demo rules`);

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
