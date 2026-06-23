// Test setup file
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.MONGO_URI = "mongodb://localhost:27017/test";
process.env.AWS_S3_BUCKET_NAME = "test-bucket";

// Register User model for testing (since it's referenced in WTF models)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  balagruhaIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Balagruha' }],
}, { timestamps: true });

// Only register if not already registered
if (!mongoose.models.User) {
  mongoose.model("User", userSchema);
}

// Global test utilities
global.testUtils = {
  // Generate test ObjectId
  generateObjectId: () => new mongoose.Types.ObjectId(),
  
  // Generate test date
  generateDate: (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  },
  
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    id: new mongoose.Types.ObjectId().toString(),
    name: "Test User",
    email: "test@example.com",
    role: "student",
    ...overrides,
  }),
  
  // Generate test pin data
  generateTestPin: (overrides = {}) => ({
    title: "Test Pin",
    content: "Test content",
    type: "text",
    author: new mongoose.Types.ObjectId(),
    language: "english",
    tags: ["test"],
    ...overrides,
  }),
  
  // Generate test interaction data
  generateTestInteraction: (overrides = {}) => ({
    studentId: new mongoose.Types.ObjectId(),
    pinId: new mongoose.Types.ObjectId(),
    type: "like",
    likeType: "thumbs_up",
    viewDuration: 0, // Add default viewDuration
    ...overrides,
  }),
  
  // Generate test submission data
  generateTestSubmission: (overrides = {}) => ({
    studentId: new mongoose.Types.ObjectId(),
    type: "article",
    title: "Test Article",
    content: "Test article content",
    language: "english",
    tags: ["test"],
    ...overrides,
  }),
  
  // Mock request object
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    user: { id: new mongoose.Types.ObjectId().toString() },
    socket: { remoteAddress: "127.0.0.1" },
    method: "GET",
    originalUrl: "/api/test",
    ...overrides,
  }),
  
  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // Mock next function
  mockNext: () => jest.fn(),
};

// Global test matchers
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },
  
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Date`,
        pass: false,
      };
    }
  },
});

// Clean up after each test
afterEach(async () => {
  jest.clearAllMocks();
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
