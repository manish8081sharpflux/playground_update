require("dotenv").config();

const assert = require("assert");
const { S3Client } = require("@aws-sdk/client-s3");
const presigner = require("@aws-sdk/s3-request-presigner");

const live = process.argv.includes("--live");
const captured = [];

if (!live) {
  S3Client.prototype.send = async function (command) {
    captured.push(command.input);
    return {};
  };
  presigner.getSignedUrl = async (_client, command) => {
    captured.push(command.input);
    return "https://signed.example.test";
  };
}

const s3 = require("../services/aws/s3");

const folders = [
  ["AWS_S3_FOLDER_TASK_ATTACHMENTS", "balagruha-task-attachments"],
  ["AWS_S3_FOLDER_MEDICAL_RECORDS", "student-medical-records"],
  ["AWS_S3_FOLDER_MEDICAL_ATTACHMENTS", "student-medical-records"],
  ["AWS_S3_FOLDER_SPORTS_TASK_ATTACHMENTS", "balagruha-sports-task-attachments"],
  ["AWS_S3_FOLDER_REPAIR_REQUEST_ATTACHMENTS", "balagruha-repair-request-attachments"],
  ["AWS_S3_FOLDER_PURCHASE_ORDER_ATTACHMENTS", "balagruha-purchase-order-attachments"],
  ["AWS_S3_FOLDER_WTF", "wtfpins"],
  ["AWS_S3_FOLDER_SHOP_PRODUCTS", "balagruha-shop-product-images"],
  ["AWS_S3_FOLDER_LMS_CONTENT", "balagruha-lms-content"],
];

const assertConfiguration = () => {
  assert.strictEqual(process.env.AWS_S3_BUCKET_NAME, "playground");
  for (const [name, expected] of folders) {
    assert.strictEqual(process.env[name], expected, `${name} must be ${expected}`);
  }
};

const assertObject = (input, prefix) => {
  assert.strictEqual(input.Bucket, process.env.AWS_S3_BUCKET_NAME);
  assert(
    input.Key.startsWith(`${prefix}/`),
    `Expected key "${input.Key}" to start with "${prefix}/"`,
  );
};

async function run() {
  assertConfiguration();
  const stamp = `s3-refactor-test-${Date.now()}`;
  const created = [];

  for (const [name] of folders.slice(0, 6)) {
    const prefix = process.env[name];
    const result = await s3.uploadFileToS3(__filename, prefix, `${stamp}.js`);
    assert.strictEqual(result.success, true);
    assert(result.key.startsWith(`${prefix}/`));
    created.push(["generic", prefix, result.key]);
  }

  const wtfUrl = await s3.uploadWtfMediaBuffer(
    Buffer.from("unified S3 test"),
    `${stamp}.txt`,
    "text/plain",
  );
  assert(wtfUrl.includes(`/${process.env.AWS_S3_FOLDER_WTF}/`));
  created.push(["wtf", null, `${process.env.AWS_S3_FOLDER_WTF}/${stamp}.txt`]);

  const shop = await s3.uploadShopProductImage(__filename, stamp);
  assert.strictEqual(shop.success, true);
  assert(shop.key.startsWith(`${process.env.AWS_S3_FOLDER_SHOP_PRODUCTS}/`));
  created.push(["shop", null, shop.key]);

  const lms = await s3.uploadLMSContent(
    Buffer.from("unified S3 test"),
    `${stamp}.txt`,
    "document",
    "text/plain",
  );
  assert.strictEqual(lms.success, true);
  assert(lms.s3Key.startsWith(`${process.env.AWS_S3_FOLDER_LMS_CONTENT}/`));
  created.push(["lms", null, lms.s3Key]);

  if (live) {
    const response = await fetch(lms.url);
    assert.strictEqual(response.status, 200, "Uploaded LMS content must be publicly readable");
  } else {
    const lmsUpload = captured.find((input) => input.Key === lms.s3Key && input.Body);
    assert.strictEqual(lmsUpload?.ACL, "public-read");
  }

  await s3.generateLMSContentUploadUrl(`${stamp}.txt`, "document", "text/plain");
  await s3.generateLMSContentDownloadUrl(lms.s3Key);

  if (!live) {
    for (const input of captured) {
      assert.strictEqual(input.Bucket, process.env.AWS_S3_BUCKET_NAME);
    }
    folders.forEach(([, prefix]) => {
      assert(
        captured.some((input) => input.Key?.startsWith(`${prefix}/`)),
        `No S3 operation was captured under ${prefix}`,
      );
    });
  }

  for (const [type, prefix, key] of created.reverse()) {
    if (type === "wtf") await s3.deleteWtfMedia(key);
    else if (type === "shop") await s3.deleteShopProductImage(key);
    else if (type === "lms") await s3.deleteLMSContent(key);
    else await s3.deleteFileFromS3(prefix, key);
  }

  if (live) {
    console.log("Live S3 upload/delete smoke tests passed for all configured folders.");
  } else {
    captured.forEach((input) => {
      if (input.Key) {
        const matchingPrefix = folders.find(([, prefix]) =>
          input.Key.startsWith(`${prefix}/`),
        );
        assert(matchingPrefix, `Unexpected unprefixed key: ${input.Key}`);
      }
    });
    console.log("Unified S3 configuration tests passed for all upload flows.");
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
