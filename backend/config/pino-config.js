const pino = require("pino");
const os = require("os");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// const getBetterStackSourceToken = (env = process.env.NODE_ENV) => {
//   if (env === 'PRODUCTION') {
//     return process.env.BETTERSTACK_API_KEY_PROD;
//   }
// }

// Pino transport for the better stack log tail service
// const transport = pino.transport({
//     target: "@logtail/pino",
//     //   options: { sourceToken: getBetterStackSourceToken(process.env.NODE_ENV) }
// });
// const streams = [
//     { stream: process.stdout },
//     { stream: pino.destination({ dest: "/Users/office/Documents/VsCodeWorkspace/Private/isfplayground/backend/logs/pino-logger.log", sync: true, }) },
//     //   { stream: streamToElastic }
// ];

// streamToElastic.on("insert", (info, error) => {
//   console.log('info ', info)
//   console.log('error', error)
// })

// streamToElastic.on("error", (error) => { console.log('error', error) })

// Generate logger based on the environment.
/*  PRODUCTION : Better stack 
    BETA : elastic 
    ALPHA : Better stack 
 */
let logger;
let errorLogger;

let logStreams = [
  { stream: process.stdout },
  {
    stream: pino.destination({
      dest: path.join(logsDir, "pino-logger.log"),
      sync: true,
    }),
  },
  // { stream: transport },
];
logger = pino(
  {
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      pid: process.pid,
      hostname: os.hostname(),
      env: process.env.NODE_ENV,
    },
    redact: {
      paths: ["req"],
      censor: "**GDPR COMPLIANT**",
    },
  },
  // transport,
  pino.multistream(logStreams)
);

errorLogger = pino(
  {
    level: "error",
    source: process.env.NODE_ENV,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ["req"],
  },
  // transport,
  pino.multistream(logStreams)
);

// Create WTF-specific logger
const wtfLogger = pino(
  {
    level: "info",
    source: "WTF",
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ["req"],
  },
  pino.multistream([
    { stream: process.stdout },
    {
      stream: pino.destination({
        dest: path.join(logsDir, "wtf-events.log"),
        sync: true,
      }),
    },
  ])
);

// Create lifecycle logger
const lifecycleLogger = pino(
  {
    level: "info",
    source: "LIFECYCLE",
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ["req"],
  },
  pino.multistream([
    { stream: process.stdout },
    {
      stream: pino.destination({
        dest: path.join(logsDir, "lifecycle-events.log"),
        sync: true,
      }),
    },
  ])
);

// Create scheduler logger
const schedulerLogger = pino(
  {
    level: "info",
    source: "SCHEDULER",
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: ["req"],
  },
  pino.multistream([
    { stream: process.stdout },
    {
      stream: pino.destination({
        dest: path.join(logsDir, "scheduler-events.log"),
        sync: true,
      }),
    },
  ])
);

module.exports = {
  logger,
  errorLogger,
  wtfLogger,
  lifecycleLogger,
  schedulerLogger,
};
