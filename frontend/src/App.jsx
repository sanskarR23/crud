import React, { useState, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function App() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null); // to keep track of camera stream

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${API}/employee/login`, {
        empId,
        password,
      });

      if (res.status === 200) {
        setLoggedIn(true);
        startCamera();
      }
    } catch (err) {
      setError("Invalid Employee ID or Password");
    }
  }

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream; // store stream
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

  return (
    <div style={{ maxWidth: 500, margin: "50px auto", fontFamily: "Segoe UI" }}>
      {!loggedIn ? (
        <form
          onSubmit={handleLogin}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 20,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h2>Employee Login</h2>
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
          <button style={{ padding: 10 }}>Login</button>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </form>
      ) : (
        <div style={{ textAlign: "center" }}>
          <h2>Welcome, {empId} 🎉</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              marginTop: 20,
              borderRadius: 8,
              border: "2px solid #333",
            }}
          ></video>
          <div style={{ marginTop: 20 }}>
 
          </div>
        </div>
      )}
    </div>
  );
}
