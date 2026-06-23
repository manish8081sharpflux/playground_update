const { exec } = require("child_process");
const path = require("path");
const { MongoClient } = require("mongodb");

const localDbUri = "mongodb://127.0.0.1:27017/isfplayground";
const dumpPath = path.join(__dirname, "./dump/isfplayground");

async function isLocalDbEmpty() {
  const client = new MongoClient(localDbUri);
  await client.connect();
  const collections = await client.db().listCollections().toArray();
  await client.close();
  return collections.length === 0;
}

async function restoreMongoDump() {
  console.log("Restoring MongoDB dump...");
  console.log("localDbUri", localDbUri);
  console.log("dumpPath", dumpPath);
  return new Promise((resolve, reject) => {
    const cmd = `mongorestore --uri="${localDbUri}" "${dumpPath}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("Restore failed:", stderr);
        return reject(error);
      }
      console.log("MongoDB restored:", stdout);
      resolve();
    });
  });
}

(async () => {
  const empty = await isLocalDbEmpty();
  if (empty) {
    await restoreMongoDump();
  } else {
    console.log("Local MongoDB already initialized.");
  }
})();
