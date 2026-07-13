const mongoose = require("mongoose");
const User = require("../models/user");

const INDEX_NAME = "email_unique_when_present";
const PARTIAL_FILTER = { email: { $exists: true, $gt: "" } };

async function ensureUserEmailIndex() {
  const collection = User.collection;
  const indexes = await collection.indexes();
  const current = indexes.find((index) => index.name === INDEX_NAME);
  if (current?.unique && JSON.stringify(current.partialFilterExpression) === JSON.stringify(PARTIAL_FILTER)) return;

  const duplicates = await collection.aggregate([
    { $match: PARTIAL_FILTER },
    { $group: { _id: "$email", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]).toArray();
  if (duplicates.length) throw new Error(`Cannot create the email unique index: duplicate email ${duplicates[0]._id}`);

  for (const index of indexes) {
    if (index.key?.email === 1 && index.unique) await collection.dropIndex(index.name);
  }
  await collection.createIndex({ email: 1 }, { name: INDEX_NAME, unique: true, partialFilterExpression: PARTIAL_FILTER });
}

module.exports = { ensureUserEmailIndex };

if (require.main === module) {
  require("dotenv").config();
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGO_URI or MONGODB_URI is required");
  mongoose.connect(uri).then(ensureUserEmailIndex).then(() => console.log("User email index is ready.")).finally(() => mongoose.disconnect());
}
