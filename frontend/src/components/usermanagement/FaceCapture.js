// FaceCapture.js
import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import "./FaceCapture.css";
import { useNavigate } from "react-router-dom";

const FaceCapture = forwardRef((props, ref) => {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    startWebcam();
    return () => stopWebcam();
  }, []);

  useImperativeHandle(ref, () => ({
    stopCamera: stopWebcam,
  }));

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setVideoReady(true);
      }
    } catch (err) {
      setError("Error accessing webcam");
      console.error("Error accessing webcam:", err);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) return;

      // Simulate a file
      const fileName = `capture_${Date.now()}.jpg`;
      const file = new File([blob], fileName, {
        type: "image/jpeg",
      });

      // Pass file and preview back to parent
      if (props.onCapture) {
        props.onCapture(file, URL.createObjectURL(blob));
      }
    }, "image/jpeg");
  };

  return (
    <div className="face-id-container">
      {error && <div className="error-message">{error}</div>}
      <div className="webcam-container">
        <video ref={videoRef} autoPlay playsInline />
        {!videoReady && (
          <div className="loading-overlay">Initializing camera...</div>
        )}
      </div>
      <div className="controls">
        <button
          className="capture-button"
          onClick={capturePhoto}
          disabled={!videoReady || isProcessing}
        >
          {isProcessing ? "Processing..." : "Capture Photo"}
        </button>
      </div>
    </div>
  );
});

export default FaceCapture;
