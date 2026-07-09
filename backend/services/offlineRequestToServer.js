const axios = require("axios");
const fs = require("fs");

exports.sendOfflineRequestToServer = ({ reqData, files, method = "POST" }) => {
  try {
    if (
      reqData.attachmentString == null ||
      reqData.attachmentString == undefined ||
      reqData.attachmentString == ""
    ) {
      reqData.attachmentString = "[]";
    }
    if (
      reqData.payload == null ||
      reqData.payload == undefined ||
      reqData.payload == ""
    ) {
      reqData.payload = "{}";
    }

    let filesData = JSON.parse(reqData.attachmentString);
    const payload = JSON.parse(reqData.payload);
    const form = new FormData();

    for (const key in payload) {
      if (key !== "facialData" && key !== "medicalHistory") {
        form.append(key, payload[key]);
      }
    }

    if (filesData && Array.isArray(filesData)) {
      filesData.forEach((file, index) => {
        const fileBuffer = fs.readFileSync(file.path);
        const blob = new Blob([fileBuffer], {
          type: file.mimetype || "application/octet-stream",
        });
        form.append(`file${index}`, blob, file.originalname);
        form.append(`${file.fieldname}`, blob, file.originalname);
      });
    }

    if (
      reqData.operation &&
      filesData?.attachments &&
      Array.isArray(filesData?.attachments)
    ) {
      filesData.attachments.forEach((file) => {
        const fileBuffer = fs.readFileSync(file.path);
        const blob = new Blob([fileBuffer], {
          type: file.mimetype || "application/octet-stream",
        });
        form.append(`attachments`, blob, file.originalname);
      });
    }

    const requestMethod = reqData.method || method.toUpperCase();
    const url = `https://playground.initiativesewafoundation.com/server${reqData.apiPath}`;
    const config = {
      headers: { Authorization: `${reqData.token}` },
      timeout: 60000,
    };

    return axios({ method: requestMethod, url, data: form, ...config })
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    console.error("Error sending offline request to server:", error);
    throw error;
  }
};

exports.sendOfflineJSONRequestToServer = ({
  reqData,
  files,
  method = "POST",
}) => {
  try {
    if (
      reqData.attachmentString == null ||
      reqData.attachmentString == undefined ||
      reqData.attachmentString == ""
    ) {
      reqData.attachmentString = "[]";
    }
    if (
      reqData.payload == null ||
      reqData.payload == undefined ||
      reqData.payload == ""
    ) {
      reqData.payload = "{}";
    }

    const payload = JSON.parse(reqData.payload);
    const requestMethod = reqData.method || method.toUpperCase();
    const url = `https://playground.initiativesewafoundation.com/server${reqData.apiPath}`;
    const config = {
      headers: { Authorization: `${reqData.token}` },
      timeout: 60000,
    };

    return axios({ method: requestMethod, url, data: payload, ...config })
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    console.error("Error sending offline request to server:", error);
    throw error;
  }
};
