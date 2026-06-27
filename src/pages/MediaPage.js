import React, { useState, useRef } from 'react';
import BotanicalDivider from '../components/BotanicalDivider';
import styles from './MediaPage.module.css';

const API = process.env.REACT_APP_API_BASE || '/api';
const MAX_FILE_SIZE_MB = 500;
const ACCEPTED = 'image/*,video/*';

export default function MediaPage() {
  const [phase, setPhase] = useState('idle'); // idle | uploading | done | error
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInput = useRef(null);
  const xhrRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFieldErrors((prev) => ({ ...prev, file: `File must be under ${MAX_FILE_SIZE_MB} MB.` }));
      return;
    }

    setFile(f);
    setFieldErrors((prev) => ({ ...prev, file: '' }));

    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview({ type: 'image', url });
    } else if (f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f);
      setPreview({ type: 'video', url });
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      const syntheticEvent = { target: { files: [f] } };
      handleFileChange(syntheticEvent);
    }
  }

  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errors = {};
    if (!file) errors.file = 'Please select a photo or video.';
    if (!form.name.trim()) errors.name = 'Please enter your name.';
    return errors;
  }

  async function handleUpload() {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPhase('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      // Step 1: Get resumable upload URL from our function
      const initRes = await fetch(`${API}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          uploaderName: form.name,
          uploaderEmail: form.email,
          message: form.message,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.uploadUrl) {
        throw new Error(initData.error || 'Failed to start upload.');
      }

      // Step 2: Upload file directly to Google Drive via XHR (for progress tracking)
      await uploadWithProgress(initData.uploadUrl, file);

      setPhase('done');
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed. Please try again.');
      setPhase('error');
    }
  }

  function uploadWithProgress(uploadUrl, f) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload error: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload.')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled.')));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', f.type);
      xhr.send(f);
    });
  }

  function startOver() {
    setPhase('idle');
    setFile(null);
    setPreview(null);
    setForm({ name: '', email: '', message: '' });
    setFieldErrors({});
    setProgress(0);
    setErrorMsg('');
    if (fileInput.current) fileInput.current.value = '';
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>In Memory of Norma Clark</p>
        <h1 className={styles.title}>Share a Memory</h1>
        <p className={styles.subtitle}>
          Photos and videos you share will be gathered into a slideshow
          for her celebration of life service.
        </p>
      </header>

      <BotanicalDivider style={{ margin: '0 auto 2.5rem' }} />

      <section className={styles.card}>
        {(phase === 'idle' || phase === 'error') && (
          <div>
            {/* File drop zone */}
            <div
              className={`${styles.dropzone} ${fieldErrors.file ? styles.dropzoneError : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
              aria-label="Upload a photo or video"
            >
              {preview ? (
                <div className={styles.preview}>
                  {preview.type === 'image' && (
                    <img src={preview.url} alt="Preview" className={styles.previewImg} />
                  )}
                  {preview.type === 'video' && (
                    <video src={preview.url} controls className={styles.previewVideo} />
                  )}
                  <p className={styles.fileName}>{file.name}</p>
                </div>
              ) : (
                <div className={styles.dropPrompt}>
                  <span className={styles.dropIcon} aria-hidden="true">🖼</span>
                  <p className={styles.dropText}>Tap or drag to add a photo or video</p>
                  <p className={styles.dropHint}>JPG, PNG, HEIC, MP4, MOV · up to 500 MB</p>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                className={styles.hiddenInput}
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>
            {fieldErrors.file && <p className={styles.fieldError}>{fieldErrors.file}</p>}

            <div className={styles.fieldRow}>
              <label className={styles.label}>Your name <span className={styles.required}>*</span></label>
              <input
                className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="So the family knows who shared this"
              />
              {fieldErrors.name && <p className={styles.fieldError}>{fieldErrors.name}</p>}
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label}>Email (optional)</label>
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="In case the family wants to reach you"
              />
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.label}>Caption or memory (optional)</label>
              <textarea
                className={styles.textarea}
                value={form.message}
                onChange={(e) => handleFormChange('message', e.target.value)}
                rows={3}
                placeholder="When was this taken? What do you remember about that day?"
              />
            </div>

            {errorMsg && <p className={styles.submitError}>{errorMsg}</p>}

            <button className={styles.submitBtn} onClick={handleUpload}>
              Share with the family
            </button>
          </div>
        )}

        {/* ── Uploading ── */}
        {phase === 'uploading' && (
          <div className={styles.centered}>
            <div className={styles.progressWrap}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.progressLabel}>{progress}%</p>
            <p className={styles.hint}>Uploading your memory…</p>
          </div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && (
          <div className={styles.centered}>
            <div className={styles.doneIcon} aria-hidden="true">✦</div>
            <h2 className={styles.doneTitle}>Thank you, {form.name.split(' ')[0]}.</h2>
            <p className={styles.hint}>
              Your memory has been received and will be part of the tribute to Norma.
            </p>
            <button className={styles.backLink} onClick={startOver}>Share another</button>
          </div>
        )}
      </section>
    </main>
  );
}
