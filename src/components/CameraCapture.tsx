"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Loader2, X, Aperture, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [preview, setPreview] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    setLoading(true);
    setError(null);
    setPreview(null);
    stopStream();

    try {
      // Request small res dulu biar cepet start, enhance pas video udah jalan
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      // Explicit play — some browsers need this even with autoplay
      await video.play();
    } catch (e: any) {
      if (
        e.name === "NotAllowedError" ||
        e.name === "PermissionDeniedError"
      ) {
        setError("Izin kamera ditolak. Izinkan akses kamera di browser.");
      } else if (
        e.name === "NotFoundError" ||
        e.name === "DevicesNotFoundError"
      ) {
        setError("Kamera tidak ditemukan.");
      } else {
        setError(`Gagal buka kamera: ${e.message}`);
      }
    }
  }, [stopStream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopStream();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide loading overlay once video actually starts playing
  const handleVideoPlaying = () => {
    setLoading(false);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPreview(canvas.toDataURL("image/jpeg", 0.9));
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const retake = () => {
    setPreview(null);
    startCamera(facingMode);
  };

  const flipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const confirmCapture = () => {
    if (!preview) return;
    const byteString = atob(preview.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: "image/jpeg" });

    stopStream();
    onCapture(blob);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="label">Ambil Foto</label>
        <button
          type="button"
          onClick={() => {
            stopStream();
            onClose();
          }}
          className="btn-ghost p-1 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="relative bg-gray-900 rounded-xl overflow-hidden min-h-[250px] flex items-center justify-center">
        {/* Video always rendered so stream attaches immediately */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlaying={handleVideoPlaying}
          className={`w-full h-full object-contain max-h-[400px] ${
            loading || error || preview ? "hidden" : ""
          }`}
        />

        {preview && (
          <img
            src={preview}
            alt="Hasil jepretan"
            className="w-full h-full object-contain max-h-[400px]"
          />
        )}

        {/* Loading overlay on top of video */}
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900 text-white/60 z-10">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Membuka kamera...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 bg-gray-900 z-10">
            <Camera className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!loading && !error && (
        <div className="flex items-center justify-center gap-3">
          {!preview ? (
            <>
              <button
                type="button"
                onClick={flipCamera}
                className="btn-secondary p-2 rounded-full"
                title="Balik kamera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={capture}
                className="btn-primary flex items-center gap-2 px-6 py-2"
              >
                <Aperture className="w-5 h-5" />
                Ambil Gambar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={retake}
                className="btn-secondary flex items-center gap-1 px-4 py-2"
              >
                <RefreshCw className="w-4 h-4" />
                Ulang
              </button>
              <button
                type="button"
                onClick={confirmCapture}
                className="btn-primary flex items-center gap-2 px-6 py-2"
              >
                Gunakan Foto
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
