exports.isValidEmail = (email) => {
  // Regular expression for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check if email is a string and not empty
  if (typeof email !== "string" || email.trim() === "") {
    return false;
  }

  // Test the email against the regex pattern
  return emailRegex.test(email.trim());
};

// convert date to local YYYY-MM-DD string without UTC day shifting
exports.dateToString = (date) => {
  if (typeof date === "string") {
    const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      return date;
    }

    date = new Date(date);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

exports.isRequestFromLocalhost = (req) => {
  // Always return false to force S3 upload during development
  // Change this back to true if you want to work completely offline
  return false;
  
  // Original logic (commented out):
  // const ip = req.socket.remoteAddress;
  // return ip === "::1" || ip === "127.0.0.1" || ip?.includes("localhost");
};

// get the file content type of the uploaded file
exports.getFileContentType = (fileName) => {
  const fileExtension = fileName.split(".").pop().toLowerCase();
  switch (fileExtension) {
    case "pdf":
      return "application/pdf";
    case "doc":
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "txt":
      return "text/plain";
    default:
      return "";
  }
};

// get the upload directory and full file name
exports.getUploadedFilesFullPath = (fileName) => {
  let fileFullPath = "";
  const path = require("path");
  let filePath = path.join(process.cwd(), "uploads", path.basename(fileName));
  fileName = filePath.replace(/\\/g, "/");
  if (!fileName.startsWith("file://")) {
    fileFullPath = `file://${fileName}`;
  }
  return fileFullPath;
};
