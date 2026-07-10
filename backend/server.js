const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

console.log("🌐 DNS servers:", dns.getServers());


const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const userV1Routes = require("./routes/v1/user");
const balagruhaV1 = require("./routes/v1/balagruha");
const authRoutes = require("./routes/auth");
const machineRoutes = require("./routes/v1/machines");
const roleRoutes = require("./routes/roleRoutes");
const taskRoutes = require("./routes/taskRoutes");
const sportsRoute = require("./routes/v1/sports");
const musicRoute = require("./routes/v1/music");
const purchaseAndRepair = require("./routes/v1/purchaseAndRepair");
const trainingSession = require("./routes/v1/trainingSession");
const moodTracker = require("./routes/studentMoodTrackerRoutes");
const wtfRoutes = require("./routes/v1/wtf");
const coinRoutes = require("./routes/v1/coin");
const schedulerRoutes = require("./routes/v1/scheduler");
const websocketRoutes = require("./routes/v1/websocket");
const wtfWebSocketService = require("./services/wtfWebSocket");
const { swaggerUi, swaggerDocs } = require("./swagger");
// Newly added routes from deployed backend
const scheduleRoutes = require("./routes/scheduleRoutes");
const medicalCheckInsRoutes = require("./routes/medicalCheckInsRoutes");
const medicalRecordsRoutes = require("./routes/medicalRecordsRoutes");
const doctorRoutes = require("./routes/doctorRoutes"); // Sprint6-Story-3-AC2: Doctor API
const hospitalRoutes = require("./routes/hospitalRoutes"); // Sprint6-Story-3-BugFix-006: Hospital API
const offlineRequestQueueRoutes = require("./routes/offlineRequestQueue");
const courseRoutes = require("./routes/courseRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const shopRoutes = require("./routes/v2/shop"); // Sprint 5: ISF Shop
const cartRoutes = require("./routes/v2/cart"); // Sprint 5: Shopping Cart
const orderRoutes = require("./routes/v2/orders"); // Sprint 5: Checkout & Orders
const adminProductRoutes = require("./routes/v2/adminProducts"); // Sprint 5: Admin Product CRUD
const inventoryRoutes = require("./routes/v2/inventory"); // Sprint 5: Inventory Management
const analyticsRoutes = require("./routes/v2/analytics"); // Sprint 5: Shop Analytics
const reportsRoutes = require("./routes/v2/reports"); // Sprint 5: Transaction Reports
const coachDeliveryRoutes = require("./routes/v2/coachDelivery"); // Sprint 5: Coach Delivery Management

// MERGED: Sprint 5 (HEAD) and Sprint 2 (LMS/FR)
const purchaseRequestRoutes = require("./routes/v2/purchase-requests"); // Sprint 5: Purchase Request Management
const vendorRoutes = require("./routes/v2/vendor"); // Sprint 5: Vendor Management
const uploadRoutes = require("./routes/v2/upload"); // Sprint 5: Generic Uploads

const frRoutes = require("./routes/v2/facialRecognition"); // Sprint 1.1: FR Rebuild
const lmsAdminCoursesRoutes = require("./routes/v2/lms/admin/courses"); // Sprint 2: LMS Admin Course Management
const lmsAdminContentRoutes = require("./routes/v2/lms/admin/content"); // Sprint 2: LMS Content Management
const lmsAdminModulesRoutes = require("./routes/v2/lms/admin/modules"); // Sprint 2: LMS Admin Module Queries
const lmsAdminQuizRoutes = require("./routes/v2/lms/admin/quiz"); // Sprint 2: LMS Quiz & Assessment Builder
const lmsAdminTranslationRoutes = require("./routes/v2/lms/admin/translations"); // Sprint 2: LMS Translation Management
const lmsStudentDashboardRoutes = require("./routes/v2/lms/student/dashboard"); // Sprint 2 Epic 01: Student Dashboard & Homepage
const lmsStudentComputerAppsRoutes = require("./routes/v2/lms/student/computerApps"); // Sprint 2 Epic 01: Computer Apps Course
const lmsStudentArtRoutes = require("./routes/v2/lms/student/art"); // Sprint 2 Epic 01: Art Course
const lmsStudentSpokenEnglishRoutes = require("./routes/v2/lms/student/spokenEnglish"); // Sprint 2 Epic 01: Spoken English Course
const lmsStudentLifeSkillsRoutes = require("./routes/v2/lms/student/lifeSkills"); // Sprint 2 Epic 01: Life Skills Course
const lmsCoachAssignmentsRoutes = require("./routes/v2/lms/coach/assignments"); // Sprint 2 Epic 03: Coach Course Assignments
const lmsCoachGradingRoutes = require("./routes/v2/lms/coach/grading"); // Sprint 2 Epic 03: Coach Grading Interface
const lmsCoachGeneralRoutes = require("./routes/v2/lms/coach"); // Sprint 2 Epic 03: Coach Manual Awards & Reports

const { exec } = require("child_process"); // For executing shell commands
const fs = require("fs"); // For file system operations
// const faceapi = require("face-api.js"); // REMOVED - Task 1: FR Rebuild

// ADDED - Task 2: FR Rebuild with @vladmandic/human
// Now using Node v18.20.5 LTS with proper tfjs-node support
const Human = require("@vladmandic/human").default;
const { humanConfig } = require("./config/humanConfig");

// ADDED - Task 4: FR Service
const frService = require("./services/frService");

// ADDED - Task 7: FR Cache Service
const frCacheService = require("./services/frCacheService");

// Import cleanup function
const { cleanupOrphanedFiles } = require("./middleware/upload");

// Import WTF scheduler service for automatic initialization
const schedulerService = require("./services/scheduler");

// if (!process.env.JWT_SECRET) {
//     console.error('JWT_SECRET is not defined in environment variables');
//     process.exit(1);
// }

const app = express();

// CORS Configuration - Task 10: Mobile Integration Prep
// Supports web, mobile app, and development origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allowed origins
    const allowedOrigins = [
      'http://localhost:3000', // Frontend development
      'http://localhost:5001', // Backend development
      'http://localhost:5173', // Vite development
      process.env.FRONTEND_URL, // Production frontend URL (from .env)
      process.env.MOBILE_APP_URL, // Mobile app URL (from .env, if applicable)
    ].filter(Boolean); // Remove undefined values

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'MAC-Address'], // Commented out to allow all requested headers
  exposedHeaders: ['X-Total-Count'], // For pagination
  maxAge: 86400, // 24 hours - cache preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Serve uploaded files locally so dev environments without working S3 creds
// (or any case where S3 upload fails) can still render images via fallback URL.
app.use("/uploads", express.static(require("path").join(process.cwd(), "uploads")));

app.use("/api/users", userRoutes);
app.use("/api/v1/users", userV1Routes);
app.use("/api/v1/balagruha", balagruhaV1);
app.use("/api/auth", authRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/v1/sports", sportsRoute);
app.use("/api/v1/music", musicRoute);
app.use("/api/v1/purchase-repair", purchaseAndRepair);
app.use("/api/v1/training-session", trainingSession);
app.use("/api/v1/mood-tracker", moodTracker);
app.use("/api/v1/wtf", wtfRoutes);
app.use("/api/v1/coin", coinRoutes);
app.use("/api/v1/scheduler", schedulerRoutes);
app.use("/api/v1/websocket", websocketRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// Newly added route mounts
app.use("/api/schedules", scheduleRoutes);
app.use("/api/medical-check-ins", medicalCheckInsRoutes);
app.use("/api/medical-records", medicalRecordsRoutes);
app.use("/api/doctors", doctorRoutes); // Sprint6-Story-3-AC2: Doctor API
app.use("/api/hospitals", hospitalRoutes); // Sprint6-Story-3-BugFix-006: Hospital API
app.use("/api/offline-requests", offlineRequestQueueRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/v2/shop", shopRoutes); // Sprint 5: ISF Shop routes
app.use("/api/v2/shop/cart", cartRoutes); // Sprint 5: Shopping Cart routes (requires auth)
app.use("/api/v2/shop/orders", orderRoutes); // Sprint 5: Checkout & Orders routes (requires auth)
app.use("/api/v2/shop/admin", adminProductRoutes); // Sprint 5: Admin Product CRUD routes (requires admin auth)
app.use("/api/v2/shop/admin/inventory", inventoryRoutes); // Sprint 5: Inventory Management routes (requires admin auth)
app.use("/api/v2/shop/admin/analytics", analyticsRoutes); // Sprint 5: Shop Analytics routes (requires admin auth)
app.use("/api/v2/shop/admin/reports", reportsRoutes); // Sprint 5: Transaction Reports routes (requires admin auth)
app.use("/api/v2/shop/coach/deliveries", coachDeliveryRoutes); // Sprint 5: Coach Delivery Management routes (requires coach auth)

// MERGED: Sprint 5 and Sprint 2 Routes
app.use("/api/v2/shop/admin/purchase-requests", purchaseRequestRoutes); // Sprint 5: Purchase Request Management routes (requires auth)
app.use("/api/v2/vendors", vendorRoutes); // Sprint 5: Vendor Management routes (requires admin auth)
app.use("/api/v2/upload", uploadRoutes); // Sprint 5: Generic Upload routes

app.use("/api/v2/fr", frRoutes); // Sprint 1.1: FR Rebuild - Facial Recognition routes
app.use("/api/v2/lms/admin/courses", lmsAdminCoursesRoutes); // Sprint 2: LMS Admin Course Management (requires admin auth)
app.use("/api/v2/lms/admin/content", lmsAdminContentRoutes); // Sprint 2: LMS Content Management (requires admin auth)
app.use("/api/v2/lms/admin/modules", lmsAdminModulesRoutes); // Sprint 2: LMS Admin Module Queries (requires admin auth)
app.use("/api/v2/lms/admin", lmsAdminQuizRoutes); // Sprint 2: LMS Quiz & Assessment Builder (requires admin auth)
app.use("/api/v2/lms/admin/translations", lmsAdminTranslationRoutes); // Sprint 2: LMS Translation Management (requires admin auth)
app.use("/api/v2/lms/student", lmsStudentDashboardRoutes); // Sprint 2 Epic 01: Student Dashboard & Homepage (requires student auth)
app.use("/api/v2/lms/student/:studentId/courses/computer-apps", lmsStudentComputerAppsRoutes); // Sprint 2 Epic 01: Computer Apps Course (requires student auth)
app.use("/api/v2/lms/student/:studentId/courses/art", lmsStudentArtRoutes); // Sprint 2 Epic 01: Art Course (requires student auth)
app.use("/api/v2/lms/student/:studentId/courses/spoken-english", lmsStudentSpokenEnglishRoutes); // Sprint 2 Epic 01: Spoken English Course (requires student auth)
app.use("/api/v2/lms/student/:studentId/courses/life-skills", lmsStudentLifeSkillsRoutes); // Sprint 2 Epic 01: Life Skills Course (requires student auth)
app.use("/api/v2/lms/coach", lmsCoachAssignmentsRoutes); // Sprint 2 Epic 03: Coach Course Assignments (requires coach auth)
app.use("/api/v2/lms/coach/grading", lmsCoachGradingRoutes); // Sprint 2 Epic 03: Coach Grading Interface (requires coach auth)
app.use("/api/v2/lms/coach", lmsCoachGeneralRoutes); // Sprint 2 Epic 03: Manual Awards & Reports

const getMongoConnectionString = () => {
  const remoteUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const localUri = process.env.MONGO_URI_LOCAL || remoteUri;

  return process.env.NODE_ENV === "local"
    ? localUri || "mongodb://localhost:27017/isfplayground"
    : remoteUri || localUri || "mongodb://localhost:27017/isfplayground";
};

const dbConnection = getMongoConnectionString();

mongoose
  .connect(dbConnection)
  .then(async () => {
    console.log(
      `✅ MongoDB connected to ${process.env.NODE_ENV === "local" ? "local database" : "remote database"
      }`
    );

    // Initialize WTF scheduler automatically after database connection
    try {
      await schedulerService.initialize();
      console.log("✅ WTF Scheduler initialized successfully - Pin expiration will run automatically");
    } catch (error) {
      console.error("❌ Failed to initialize WTF Scheduler:", error.message);
      console.log("⚠️ Pin expiration will not run automatically. Admin must manually initialize scheduler.");
    }

    // loadMongoDump();
    // load the database with the dump into the local db if the node_env is local and dbConnection string have the localhost db connection
    if (
      process.env.NODE_ENV === "local" &&
      dbConnection.includes("localhost")
    ) {
      // loadMongoDump();
    }
    // Uncomment the line below to load the MongoDB dump when the server starts
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

const loadMongoDump = () => {
  const dumpPath = path.join(__dirname, "db", "dump");
  const mongoUri = process.env.MONGO_URI;

  if (!fs.existsSync(dumpPath)) {
    console.error("❌ Dump folder not found at:", dumpPath);
    return;
  }

  console.log("ℹ️ Loading MongoDB dump from:", dumpPath);

  const command = `mongorestore --uri="${mongoUri}" --drop ${dumpPath}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Error loading MongoDB dump:", error.message);
      return;
    }
    if (stderr) {
      console.error("⚠️ MongoDB restore stderr:", stderr);
    }
    console.log("✅ MongoDB dump loaded successfully:", stdout);
  });
};

app.get("/", (req, res) => {
  res.send(
    "Welcome to the API! Use /api/users for user routes or /api-docs for API documentation."
  );
});

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});

const PORT = process.env.PORT || 5001;
let server;
let humanInstance = null;

async function initializeHuman() {
  try {
    console.log("🔄 Initializing Human library for face recognition...");

    // Create Human instance with configuration
    humanInstance = new Human(humanConfig);

    // Load and warmup models
    await humanInstance.load();
    await humanInstance.warmup();

    console.log("✅ Human library initialized successfully");
    console.log(`   - Models loaded from: ${humanConfig.modelBasePath}`);
    console.log(`   - Face detection: ${humanConfig.face.detector.enabled ? 'enabled' : 'disabled'}`);
    console.log(`   - Face recognition: ${humanConfig.face.description.enabled ? 'enabled' : 'disabled'}`);
    console.log(`   - Liveness detection: ${humanConfig.face.liveness.enabled ? 'enabled' : 'disabled'}`);

    // ADDED - Task 4: Initialize FR Service with Human instance
    frService.initializeFRService(humanInstance);

    // ADDED - Task 7: Initialize FR Cache and warm up
    frCacheService.initializeCache();
    // Warm cache after a short delay to avoid blocking server startup
    setTimeout(async () => {
      try {
        await frCacheService.warmCache();
      } catch (error) {
        console.error('⚠️  FR Cache: Failed to warm cache:', error.message);
      }
    }, 5000); // Wait 5 seconds after server starts

    return humanInstance;
  } catch (error) {
    console.error("❌ Error initializing Human library:", error);
    throw error;
  }
}

// Boot sequence: load FR models BEFORE accepting traffic so the first login
// attempt doesn't 500 with "Human library not initialized". If FR init fails,
// we log and start anyway — login by password still works, FR routes will 503
// via the getHuman() guard below.
(async () => {
  try {
    await initializeHuman();
  } catch (err) {
    console.error("⚠️  FR init failed — server will start without face recognition:", err.message);
  }

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Backend URL: http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/`);

    try {
      cleanupOrphanedFiles();
      console.log("🧹 Initial file cleanup completed");
    } catch (error) {
      console.error("❌ Initial file cleanup failed:", error.message);
    }
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the existing backend or set PORT to a free port.`);
      process.exit(1);
    }

    console.error("Server failed to start:", error.message);
    process.exit(1);
  });

  try {
    wtfWebSocketService.initialize(server);
    console.log("✅ WTF WebSocket server initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing WTF WebSocket server:", error);
  }
})();

// Export Human instance for use in services
module.exports.getHuman = () => {
  if (!humanInstance) {
    throw new Error("Human library not initialized. Server may still be starting up.");
  }
  return humanInstance;
};
