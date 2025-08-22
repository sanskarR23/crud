import React, { useState, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Detect if running inside Electron
const isElectron = navigator.userAgent.toLowerCase().includes("electron");

export default function App() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0: login/register, 1-3: capture, 4: done
  const [capturedImages, setCapturedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [hasImages, setHasImages] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Login/Register handler
  async function handleLoginOrRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/employee/check`, {
        empId,
        password,
      });

      if (res.data && res.data.exists) {
        setUserExists(true);
        if (res.data.hasImages) {
          setHasImages(true);
          setStep(4); // Already has images
        } else {
          setHasImages(false);
          setShowCapture(true);
          setStep(1);
          startCamera();
        }
      } else {
        // Register user
        const regRes = await axios.post(`${API}/employee/register`, {
          empId,
          password,
        });
        if (regRes.status === 200) {
          setUserExists(true);
          setHasImages(false);
          setShowCapture(true);
          setStep(1);
          startCamera();
        } else {
          setError("Registration failed");
        }
      }
    } catch (err) {
      setError("Login/Registration failed");
    }
    setLoading(false);
  }

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera");
      });
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function captureImage() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImages((prev) => {
      const newImages = [...prev, dataUrl];
      if (step < 3) {
        setStep(step + 1);
      } else {
        setStep(4);
        stopCamera();
        sendImagesToBackend(newImages);
      }
      return newImages;
    });
  }

  async function sendImagesToBackend(images) {
    setLoading(true);
    try {
      await axios.post(`${API}/employee/faces`, {
        empId,
        images,
      });
      setError("");
    } catch (err) {
      setError("Failed to save images");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 500, margin: "50px auto", fontFamily: "Segoe UI" }}>
      {/* Electron / Browser Info */}
      <div
        style={{
          background: isElectron ? "#d4f8d4" : "#f8d4d4",
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        {isElectron ? "✅ Running inside Electron" : "🌐 Running in Browser"}
      </div>

      {step === 0 && (
        <form
          onSubmit={handleLoginOrRegister}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h2>Employee Login / Registration</h2>
          <input
            required
            placeholder="Employee ID"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            style={{ padding: 10 }}
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10 }}
          />
          <button style={{ padding: 10 }} disabled={loading}>
            Continue
          </button>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </form>
      )}

      {showCapture && step > 0 && step < 4 && (
        <div style={{ textAlign: "center" }}>
          <h2>Capture Photo {step} / 3</h2>
          <p>
            {step === 1 && "Please look straight (center) and click Capture."}
            {step === 2 &&
              "Please turn your face to the left and click Capture."}
            {step === 3 &&
              "Please turn your face to the right and click Capture."}
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              marginTop: 20,
              borderRadius: 8,
              border: "2px solid #333",
            }}
          ></video>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={captureImage}
              disabled={loading}
              style={{ padding: 10 }}
            >
              Capture
            </button>
          </div>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: "center" }}>
          <h2>Registration Complete!</h2>
          <p>All 3 images have been captured and saved.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {capturedImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`capture${idx + 1}`}
                style={{ width: 80, borderRadius: 8, border: "1px solid #aaa" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
