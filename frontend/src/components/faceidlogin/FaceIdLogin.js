import React, { useEffect, useRef, useState } from "react";
import "./FaceIdLogin.css";
import { faceIdlogin } from "../../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import * as Human from "@vladmandic/human";

// Minimum capture quality before the user is allowed to submit. Real-world
// indoor lighting often scores 45–55%; backend re-validates anyway, so a
// permissive gate here improves UX without weakening security.
const CAPTURE_QUALITY_MIN = 45;

/**
 * FaceIdLogin Component - Enhanced with Real-Time Face Detection
 * Sprint 1.1 Epic 02 Story 01 Task 8: Frontend Face Capture UI
 *
 * Features:
 * - Real-time face detection preview
 * - Bounding box around detected face
 * - Alignment guide (oval overlay)
 * - Lighting indicator (green=good, yellow=acceptable, red=poor)
 * - Distance guidance ("Move closer" / "Move back")
 * - Capture quality score display
 * - Success/failure animations
 * - Help modal with photo examples
 * - Comprehensive error handling
 */
const FaceIdLogin = ({ onToggle }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const humanRef = useRef(null);
  const detectionLoopRef = useRef(null);

  const [videoReady, setVideoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Real-time face detection state
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceData, setFaceData] = useState(null);
  const [lightingQuality, setLightingQuality] = useState("unknown"); // good, acceptable, poor, unknown
  const [distanceGuidance, setDistanceGuidance] = useState(""); // "Move closer", "Move back", "Perfect"
  const [captureQuality, setCaptureQuality] = useState(null); // 0-100 score
  const [confidenceScore, setConfidenceScore] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    initializeHuman();
    startWebcam();
    return () => {
      stopWebcam();
      stopDetectionLoop();
    };
  }, []);

  /**
   * Initialize Human library for face detection
   */
  const initializeHuman = async () => {
    try {
      // Configure Human for browser use - lightweight config for real-time preview.
      // Models are self-hosted under /models (copied from node_modules at install time
      // — see frontend/package.json `postinstall`). Avoids CDN dependency at runtime.
      const config = {
        modelBasePath: "/models",
        face: {
          enabled: true,
          detector: { enabled: true, rotation: false },
          mesh: { enabled: true },
          iris: { enabled: false },
          description: { enabled: false },
          emotion: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        gesture: { enabled: false },
      };

      humanRef.current = new Human.default(config);
      await humanRef.current.load();
    } catch (err) {
      console.error("Error initializing Human library:", err);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setVideoReady(true);
          startDetectionLoop();
        };
      }
    } catch (err) {
      setError("Error accessing webcam. Please grant camera permissions.");
      console.error("Error accessing webcam:", err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  /**
   * Start real-time face detection loop
   */
  const startDetectionLoop = () => {
    if (!humanRef.current || !videoRef.current) return;

    const detect = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        // Run face detection
        const result = await humanRef.current.detect(videoRef.current);

        // Clear canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (result.face && result.face.length > 0) {
          const face = result.face[0];
          setFaceDetected(true);
          setFaceData(face);

          // Draw bounding box
          drawBoundingBox(ctx, face.box, canvas.width, canvas.height);

          // Calculate and update quality metrics
          updateQualityMetrics(face, canvas);
        } else {
          setFaceDetected(false);
          setFaceData(null);
          setCaptureQuality(null);
          setLightingQuality("unknown");
          setDistanceGuidance("");
        }
      } catch (err) {
        console.error("Detection error:", err);
      }

      // Continue loop
      detectionLoopRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  const stopDetectionLoop = () => {
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  };

  /**
   * Draw bounding box around detected face
   */
  const drawBoundingBox = (ctx, box, canvasWidth, canvasHeight) => {
    const [x, y, width, height] = box;

    // Scale coordinates to canvas size
    const scaleX = canvasWidth / videoRef.current.videoWidth;
    const scaleY = canvasHeight / videoRef.current.videoHeight;

    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    // Draw bounding box
    ctx.strokeStyle = "#28a745";
    ctx.lineWidth = 3;
    ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

    // Draw corner markers
    const cornerLength = 20;
    ctx.lineCap = "round";

    // Top-left
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + cornerLength);
    ctx.lineTo(scaledX, scaledY);
    ctx.lineTo(scaledX + cornerLength, scaledY);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledWidth - cornerLength, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY);
    ctx.lineTo(scaledX + scaledWidth, scaledY + cornerLength);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(scaledX, scaledY + scaledHeight - cornerLength);
    ctx.lineTo(scaledX, scaledY + scaledHeight);
    ctx.lineTo(scaledX + cornerLength, scaledY + scaledHeight);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(scaledX + scaledWidth - cornerLength, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight);
    ctx.lineTo(scaledX + scaledWidth, scaledY + scaledHeight - cornerLength);
    ctx.stroke();

    // Draw alignment guide (oval overlay) in center
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const ovalWidth = canvasWidth * 0.5;
    const ovalHeight = canvasHeight * 0.65;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, ovalWidth / 2, ovalHeight / 2, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  /**
   * Update quality metrics based on detected face
   */
  const updateQualityMetrics = (face, canvas) => {
    // Calculate face size for distance guidance
    const faceArea = face.box[2] * face.box[3];
    const videoArea = canvas.width * canvas.height;
    const faceRatio = faceArea / videoArea;

    // Distance guidance based on face size
    if (faceRatio < 0.08) {
      setDistanceGuidance("Move closer");
    } else if (faceRatio > 0.30) {
      setDistanceGuidance("Move back");
    } else {
      setDistanceGuidance("Perfect distance");
    }

    // Estimate lighting quality from face detection confidence
    const detectionConfidence = face.score || 0;
    if (detectionConfidence > 0.95) {
      setLightingQuality("good");
    } else if (detectionConfidence > 0.85) {
      setLightingQuality("acceptable");
    } else {
      setLightingQuality("poor");
    }

    // Calculate overall capture quality score (0-100)
    let qualityScore = 0;

    // 1. Detection confidence (40%)
    qualityScore += detectionConfidence * 40;

    // 2. Face size (30%)
    const idealRatio = 0.15;
    const sizeScore = 1 - Math.abs(faceRatio - idealRatio) / idealRatio;
    qualityScore += Math.max(0, sizeScore) * 30;

    // 3. Face mesh quality (30%)
    const meshQuality = face.mesh ? face.mesh.length / 468 : 0;
    qualityScore += meshQuality * 30;

    setCaptureQuality(Math.round(qualityScore));
  };

  const capturePhoto = async () => {
    if (!videoReady || isProcessing) return;

    // Check if face is detected before capture
    if (!faceDetected) {
      setError("No face detected. Please position your face in the frame.");
      return;
    }

    // Check quality threshold. 45% is a balance between rejecting truly bad
    // captures and letting indoor lighting through; backend still re-validates.
    if (captureQuality < CAPTURE_QUALITY_MIN) {
      setError(`Image quality too low (${captureQuality}%). Please improve lighting and positioning.`);
      return;
    }

    setIsProcessing(true);
    setError("");
    stopDetectionLoop(); // Pause detection during processing

    try {
      const canvas = document.createElement("canvas");
      const videoEl = videoRef.current;
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      const imageBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95)
      );
      const formData = new FormData();
      formData.append("facialData", imageBlob, "capture.jpg");

      const response = await faceIdlogin(formData);
      // Backend returns the envelope { success, message, data: { token, user, confidence } }.
      // faceIdlogin already unwrapped axios's response.data, so `response` IS the envelope.
      if (!response?.success) {
        throw new Error(response?.message || "Login failed");
      }

      const { token, user, confidence } = response.data || {};

      // Set confidence score from backend
      if (confidence !== undefined) {
        setConfidenceScore(Math.round(confidence * 100));
      }

      // Format the user data to match our auth context expectations
      const userData = {
        token,
        user: {
          id: user.id || user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      };

      // Show success animation
      setSuccess(true);

      // Wait a moment to show success animation before navigating
      setTimeout(() => {
        login(userData);
        navigate("/dashboard");
      }, 1500);

    } catch (err) {
      const apiMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Face recognition failed";

      // User-friendly error messages
      let userMessage = apiMsg;
      if (apiMsg.includes("liveness")) {
        userMessage =
          "Liveness check failed. Please ensure you are using a live camera, not a photo or screen.";
      } else if (apiMsg.includes("no face")) {
        userMessage =
          "No face detected. Please position your face clearly in the frame.";
      } else if (apiMsg.includes("not found") || apiMsg.includes("not recognized")) {
        userMessage =
          "Face not recognized. Please ensure you are registered or try again with better lighting.";
      }

      setError(userMessage);
      startDetectionLoop(); // Resume detection on error
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get lighting indicator CSS class
   */
  const getLightingClass = () => {
    switch (lightingQuality) {
      case "good":
        return "lighting-good";
      case "acceptable":
        return "lighting-acceptable";
      case "poor":
        return "lighting-poor";
      default:
        return "";
    }
  };

  /**
   * Get quality score color
   */
  const getQualityColor = () => {
    if (captureQuality >= 80) return "#28a745"; // Green
    if (captureQuality >= 60) return "#ffc107"; // Yellow
    return "#dc3545"; // Red
  };

  return (
    <div className="face-id-container">
      {/* Success Animation */}
      {success && (
        <div className="success-overlay">
          <div className="success-icon">✓</div>
          <div className="success-text">Face Recognized!</div>
          {confidenceScore && (
            <div className="confidence-score">
              Confidence: {confidenceScore}%
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Webcam Container with Overlays */}
      <div className="webcam-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          aria-label="Camera feed for face recognition login"
          onLoadedMetadata={() => {
            // Set canvas size to match video
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
          }}
        />

        {/* Overlay Canvas for Face Detection Visualization */}
        <canvas ref={canvasRef} className="face-overlay" />

        {/* Loading Overlay */}
        {!videoReady && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div>Initializing camera...</div>
          </div>
        )}

        {/* Face Detection Indicator */}
        {videoReady && faceDetected && (
          <div className="face-detected-indicator">
            ✓ Face Detected
          </div>
        )}

        {/* Lighting Indicator */}
        {videoReady && lightingQuality !== "unknown" && (
          <div className={`lighting-indicator ${getLightingClass()}`}>
            <span className="indicator-dot"></span>
            Lighting: {lightingQuality}
          </div>
        )}

        {/* Distance Guidance */}
        {videoReady && distanceGuidance && (
          <div className="distance-guidance">
            {distanceGuidance}
          </div>
        )}

        {/* Capture Quality Score */}
        {videoReady && captureQuality !== null && (
          <div
            className="quality-score"
            style={{ color: getQualityColor() }}
          >
            Quality: {captureQuality}%
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`capture-button ${faceDetected && captureQuality >= CAPTURE_QUALITY_MIN ? "ready" : ""}`}
          onClick={capturePhoto}
          disabled={!videoReady || isProcessing || !faceDetected || captureQuality < CAPTURE_QUALITY_MIN}
        >
          {isProcessing ? "Processing..." : "Capture & Login"}
        </button>

        {/* Tell the user WHY the button is disabled, so they aren't stuck
            staring at a grey button with no feedback. */}
        {!isProcessing && (!videoReady || !faceDetected || captureQuality < CAPTURE_QUALITY_MIN) && (
          <p className="capture-hint" style={{ marginTop: 8, fontSize: 13, color: "#6b7280", textAlign: "center" }}>
            {!videoReady
              ? "Initializing camera and face models…"
              : !faceDetected
                ? "Position your face in the frame so the camera can see it."
                : `Quality ${captureQuality}% — improve lighting or move slightly closer (need ${CAPTURE_QUALITY_MIN}%).`}
          </p>
        )}

        <button
          className="help-button"
          onClick={() => setShowHelp(true)}
          disabled={isProcessing}
        >
          Need Help?
        </button>
      </div>

      {/* Fallback Link */}
      <a href="#" onClick={onToggle} className="toggle-link">
        Login with Username and PIN
      </a>

      {/* Help Modal */}
      {showHelp && (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setShowHelp(false)}
            >
              ×
            </button>

            <h2>Face Recognition Login Help</h2>

            <div className="help-section">
              <h3>Tips for Best Results</h3>
              <ul>
                <li>
                  <strong>Lighting:</strong> Ensure your face is well-lit from
                  the front. Avoid backlighting (light behind you).
                </li>
                <li>
                  <strong>Position:</strong> Center your face in the oval guide.
                  Keep your face straight and look directly at the camera.
                </li>
                <li>
                  <strong>Distance:</strong> Position yourself so your face
                  fills about 30-40% of the frame.
                </li>
                <li>
                  <strong>Environment:</strong> Use in a stable, well-lit
                  environment. Avoid extreme shadows or bright lights.
                </li>
                <li>
                  <strong>Camera:</strong> Ensure your camera lens is clean and
                  unobstructed.
                </li>
              </ul>
            </div>

            <div className="help-section">
              <h3>Quality Indicators</h3>
              <ul>
                <li>
                  <strong className="text-green">Green Lighting:</strong> Optimal
                  lighting conditions detected
                </li>
                <li>
                  <strong className="text-yellow">Yellow Lighting:</strong>{" "}
                  Acceptable, but consider improving lighting
                </li>
                <li>
                  <strong className="text-red">Red Lighting:</strong> Poor
                  lighting - please adjust your environment
                </li>
                <li>
                  <strong>Quality Score:</strong> Must be above 60% to capture.
                  80%+ is ideal.
                </li>
              </ul>
            </div>

            <div className="help-section">
              <h3>Troubleshooting</h3>
              <ul>
                <li>
                  <strong>No face detected:</strong> Move into better lighting
                  and ensure your face is visible and unobstructed.
                </li>
                <li>
                  <strong>Liveness check failed:</strong> Ensure you're using a
                  live camera. Photos and screens will be rejected.
                </li>
                <li>
                  <strong>Face not recognized:</strong> Ensure you're registered
                  in the system. Contact your administrator if issues persist.
                </li>
                <li>
                  <strong>Camera not working:</strong> Check browser permissions
                  and ensure no other app is using the camera.
                </li>
              </ul>
            </div>

            <div className="help-section">
              <h3>Still Having Issues?</h3>
              <p>
                Use the "Login with Username and PIN" option below, or contact
                your system administrator for assistance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaceIdLogin;
