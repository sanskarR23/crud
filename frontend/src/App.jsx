import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Detect if running inside Electron
const isElectron = typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("electron");

export default function App() {
  // Auth / capture states
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0: idle/login, 1-3 capture, 4 done
  const [capturedImages, setCapturedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState("");
  // uploader states for manual image upload (3 images)
  const [uploadPreviews, setUploadPreviews] = useState([null, null, null]);
  const [uploadFiles, setUploadFiles] = useState([null, null, null]);
  const [uploadError, setUploadError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Employee management states
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [fetchId, setFetchId] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [form, setForm] = useState({ EmpId: "", EmpName: "", EmpDeskId: "", Password: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ------------------------- API calls
  async function fetchEmployees() {
    setEmployeesLoading(true);
    try {
      const res = await axios.get(`${API}/employee`);
      setEmployees(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setEmployeesLoading(false);
    }
  }

  async function fetchEmployee(id) {
    try {
      const res = await axios.get(`${API}/employee/${id}`);
      setSelected(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  // Fetch by ID from the input and animate the result
  async function fetchById() {
    if (!fetchId) return;
    setFetchLoading(true);
    try {
      const res = await axios.get(`${API}/employee/${fetchId}`);
      setSelected(res.data);
    } catch (e) {
      setError("Failed to fetch employee");
      setSelected(null);
    } finally {
      setFetchLoading(false);
    }
  }

  async function createEmployee(payload) {
    try {
      const res = await axios.post(`${API}/employee`, payload);
      await fetchEmployees();
      return res;
    } catch (e) {
  throw e;
    }
  }

  async function updateEmployee(id, payload) {
    try {
      await axios.put(`${API}/employee/${id}`, payload);
      await fetchEmployees();
    } catch (e) {
      throw e;
    }
  }

  async function deleteEmployee(id) {
    try {
      await axios.delete(`${API}/employee/${id}`);
      if (selected && selected.empId === id) setSelected(null);
      await fetchEmployees();
    } catch (e) {
      console.error(e);
    }
  }

  // Animated delete: confirm, animate out, then call API (optimistic)
  async function deleteAnimated(id) {
    if (!confirm(`Delete employee ${id}? This cannot be undone.`)) return;
    // mark deleting to apply CSS
    setDeletingId(id);

    // wait for animation to complete (match CSS 420ms)
    setTimeout(async () => {
      try {
        await axios.delete(`${API}/employee/${id}`);
        // optimistic remove from list
        setEmployees((prev) => prev.filter((e) => (e.empId || e.EmpId) !== id));
        if (selected && (selected.empId || selected.EmpId) === id) setSelected(null);
        setToast({ message: `Deleted ${id}`, type: 'success' });
      } catch (err) {
        // if delete failed, refetch to restore state
        await fetchEmployees();
        setToast({ message: `Failed to delete ${id}`, type: 'error' });
      } finally {
        setDeletingId(null);
        // clear toast after 2s
        setTimeout(() => setToast({ message: '', type: '' }), 2000);
      }
    }, 420);
  }

  async function login() {
    setLoginError("");
    setLoginLoading(true);
    setLoginSuccess(false);
    try {
      const res = await axios.post(`${API}/employee/login`, { EmpId: empId, Password: password });
      if (res.status === 200) {
        setSelected(res.data.employee);
        setLoginSuccess(true);
        // keep success visible briefly
        setTimeout(() => setLoginSuccess(false), 1800);
      }
    } catch (e) {
      setLoginError(e?.response?.data?.message || "Login failed");
      // small shake on failure handled by CSS class on the auth panel using loginError
    } finally {
      setLoginLoading(false);
    }
  }

  async function checkAndCapture() {
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/employee/check`, { EmpId: empId, Password: password });
      if (res.data && res.data.exists) {
        if (res.data.hasImages) {
          setStep(4);
        } else {
          setStep(1);
          startCamera();
        }
      } else {
        // create employee first
        await createEmployee({ EmpId: empId, EmpName: empId, EmpDeskId: "desk_01", Password: password });
        setStep(1);
        startCamera();
      }
    } catch (e) {
      setError("Check failed");
    }
    setLoading(false);
  }

  async function sendImagesToBackend(images) {
    setLoading(true);
    try {
      await axios.post(`${API}/employee/faces`, {
        EmpId: empId,
        Images: images,
      });
      await fetchEmployees();
      setError("");
    } catch (err) {
      setError("Failed to save images");
    }
    setLoading(false);
  }

  // -------------------------
  // Manual uploader helpers
  // -------------------------
  function handleFileChange(idx, e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreviews((p) => {
        const copy = [...p];
        copy[idx] = reader.result;
        return copy;
      });
      setUploadFiles((p) => {
        const copy = [...p];
        copy[idx] = file;
        return copy;
      });
    };
    reader.readAsDataURL(file);
  }

  async function uploadFacesFromFiles() {
    setUploadError("");
    if (!empId) return setUploadError("Enter Employee ID above before uploading");
    const imgs = uploadPreviews.filter(Boolean);
    if (imgs.length !== 3) return setUploadError("Please select 3 images");
    setUploadLoading(true);
    try {
      await sendImagesToBackend(imgs);
      setUploadPreviews([null, null, null]);
      setUploadFiles([null, null, null]);
      setUploadError("");
    } catch (e) {
      setUploadError("Upload failed");
    }
    setUploadLoading(false);
  }

  // ------------------------- Camera helpers
  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
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
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function captureImage() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setCapturedImages((prev) => {
      const newImages = [...prev, dataUrl];
      if (step < 3) {
        setStep((s) => s + 1);
      } else {
        setStep(4);
        stopCamera();
        sendImagesToBackend(newImages);
      }
      return newImages;
    });
  }

  // ------------------------- UI handlers
  function onSelectEmployee(e) {
    const id = e.target.value;
    if (!id) return setSelected(null);
    fetchEmployee(id);
  }

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onCreateFromForm(e) {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess(false);
    // simple validation
    if (!form.EmpId || !form.Password) {
      setCreateError("EmpId and Password are required");
      return;
    }
    setCreateLoading(true);
    try {
      await createEmployee(form);
      setCreateSuccess(true);
      setForm({ EmpId: "", EmpName: "", EmpDeskId: "", Password: "" });
      // hide success after a short time
      setTimeout(() => setCreateSuccess(false), 2200);
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Create failed");
    } finally {
      setCreateLoading(false);
    }
  }

  async function onUpdateFromForm(e) {
    e.preventDefault();
    if (!selected) return;
    try {
      await updateEmployee(selected.empId || selected.EmpId, selected);
    } catch (err) {
      setError("Update failed");
    }
  }

  return (
    <div className="app-root">
      <header className="app-header slide-down">
        <h1>Employee CRUD — Animated UI</h1>
      </header>

      <main className="container">
        <section className={`panel fade ${loginError ? 'shake' : ''}`}>
          <h3>Auth / Face Capture</h3>
          <div className="row">
            <input placeholder="Employee ID" value={empId} onChange={(e) => setEmpId(e.target.value)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={login} disabled={loginLoading} className={`btn ${loginSuccess ? 'success' : ''}`}>
              {loginLoading ? 'Logging in...' : loginSuccess ? '✓' : 'Login'}
            </button>
            <button onClick={checkAndCapture} disabled={loginLoading} className="btn">Check & Capture</button>
          </div>
          {loginError && <div className="error">{loginError}</div>}
          {step > 0 && step < 4 && (
            <div className="capture">
              <h4>Capture {step} / 3</h4>
              <video ref={videoRef} autoPlay playsInline muted className="video-box" />
              <div className="row">
                <button onClick={captureImage} className="btn">Capture</button>
                <button onClick={() => { stopCamera(); setStep(0); }} className="btn alt">Cancel</button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="capture-done">
              <strong>Images saved.</strong>
              <div className="thumbs">
                {capturedImages.map((i, idx) => <img key={idx} src={i} className="thumb" />)}
              </div>
            </div>
          )}
        </section>

        <section className="panel fade delay-0">
          <h3>Upload Faces (3 images)</h3>
          <div className="uploader">
            <div className="row">
              <label className="file-label">Image 1<input type="file" accept="image/*" onChange={(e) => handleFileChange(0, e)} className="file-input" /></label>
              <label className="file-label">Image 2<input type="file" accept="image/*" onChange={(e) => handleFileChange(1, e)} className="file-input" /></label>
              <label className="file-label">Image 3<input type="file" accept="image/*" onChange={(e) => handleFileChange(2, e)} className="file-input" /></label>
            </div>
            <div className="thumbs">
              {uploadPreviews.map((p, i) => p ? <img key={i} src={p} className="thumb" /> : <div key={i} style={{width:72,height:72,borderRadius:8,background:'#f0f0f4',display:'flex',alignItems:'center',justifyContent:'center',color:'#888'}}>#{i+1}</div>)}
            </div>
            {uploadError && <div className="error">{uploadError}</div>}
            <div className="row" style={{marginTop:8}}>
              <button onClick={uploadFacesFromFiles} className="btn pulse" disabled={uploadLoading}>{uploadLoading ? 'Uploading...' : 'Upload Faces'}</button>
              <button onClick={() => { setUploadPreviews([null, null, null]); setUploadFiles([null, null, null]); setUploadError(''); }} className="btn alt">Clear</button>
            </div>
          </div>
        </section>

        <section className="panel fade delay-1">
          <h3>Employees</h3>
          <div className="row">
            <select onChange={onSelectEmployee} className="select">
              <option value="">-- select --</option>
              {employees.map((emp, i) => (
                <option key={i} value={emp.empId || emp.EmpId}>{emp.empId || emp.EmpId} - {emp.empName || emp.EmpName}</option>
              ))}
            </select>
            <button onClick={fetchEmployees} className="btn">Refresh</button>
          </div>

          <div className="list">
            {employees.map((emp, i) => {
              const id = emp.empId || emp.EmpId;
              const name = emp.empName || emp.EmpName || id;
              const initials = name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
              const isDeleting = deletingId === id;
              return (
                <div key={i} className={`list-item card ${isDeleting ? 'removing' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="card-left">
                    <div className="avatar">{initials}</div>
                    <div>
                      <strong>{id}</strong>
                      <div className="muted">{name}</div>
                    </div>
                  </div>
                  <div className="actions">
                    <button onClick={() => fetchEmployee(id)} className="btn small">View</button>
                  <button onClick={() => deleteAnimated(id)} className="btn small alt">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
          {employeesLoading && (
            <div className="overlay">
              <div className="spinner" />
            </div>
          )}
          {/* Toast */}
          {toast.message && (
            <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>{toast.message}</div>
          )}
        </section>

        <section className="panel fade delay-2">
          <h3>Create Employee</h3>
          <form onSubmit={onCreateFromForm} className={`form ${createError ? 'shake' : ''}`}>
            <input name="EmpId" placeholder="EmpId" value={form.EmpId} onChange={onFormChange} />
            <input name="EmpName" placeholder="EmpName" value={form.EmpName} onChange={onFormChange} />
            <input name="EmpDeskId" placeholder="DeskId" value={form.EmpDeskId} onChange={onFormChange} />
            <input name="Password" placeholder="Password" value={form.Password} onChange={onFormChange} />
            {createError && <div className="error">{createError}</div>}
            <div className="row">
              <button className={`btn create-btn ${createLoading ? 'loading' : ''}`} disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
              {createSuccess && <div className="create-success">✓</div>}
            </div>
          </form>
        </section>

        <section className="panel fade delay-3">
          <h3>Selected</h3>
          <div className="row" style={{marginBottom:8}}>
            <input placeholder="Fetch by EmpId" value={fetchId} onChange={(e) => setFetchId(e.target.value)} />
            <button onClick={fetchById} className="btn" disabled={fetchLoading}>{fetchLoading ? 'Fetching...' : 'Fetch'}</button>
            <button onClick={() => { setSelected(null); setFetchId(''); }} className="btn alt">Clear</button>
          </div>

          {selected ? (
            <div className={`selected-card flip-in`} key={selected.empId || selected.EmpId}>
              <div className="card-left">
                <div className="avatar large">{(selected.empName || selected.EmpName || '').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase()}</div>
                <div>
                  <h4 style={{margin:0}}>{selected.empId || selected.EmpId}</h4>
                  <div className="muted">{selected.empName || selected.EmpName}</div>
                  <div className="muted">Desk: {selected.empDeskId || selected.EmpDeskId}</div>
                </div>
              </div>
              <div className="img-grid">
                {selected.imageCenter || selected.ImageCenter ? (
                  (selected.imageCenter || selected.ImageCenter).toString().startsWith('data:') ? (
                    <img src={(selected.imageCenter || selected.ImageCenter)} className="grid-img" />
                  ) : (
                    <div className="img-filename">{selected.imageCenter || selected.ImageCenter}</div>
                  )
                ) : <div className="img-placeholder">No Image</div>}
                {selected.imageLeft || selected.ImageLeft ? (
                  (selected.imageLeft || selected.ImageLeft).toString().startsWith('data:') ? (
                    <img src={(selected.imageLeft || selected.ImageLeft)} className="grid-img" />
                  ) : (
                    <div className="img-filename">{selected.imageLeft || selected.ImageLeft}</div>
                  )
                ) : <div className="img-placeholder">No Image</div>}
                {selected.imageRight || selected.ImageRight ? (
                  (selected.imageRight || selected.ImageRight).toString().startsWith('data:') ? (
                    <img src={(selected.imageRight || selected.ImageRight)} className="grid-img" />
                  ) : (
                    <div className="img-filename">{selected.imageRight || selected.ImageRight}</div>
                  )
                ) : <div className="img-placeholder">No Image</div>}
              </div>
            </div>
          ) : (
            <div className="muted">No employee selected</div>
          )}
        </section>
      </main>

      <footer className="app-footer fade">API: {API} {isElectron ? '(Electron)' : ''}</footer>
    </div>
  );
}
