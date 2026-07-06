"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  RotateCw, RotateCcw, Crop, Sun, Contrast, Sparkles,
  Check, X, RefreshCw, Move
} from "lucide-react";

interface CoverEditorProps {
  imageFile: File | Blob;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

type Tool = "none" | "crop" | "brightness" | "contrast" | "sharpen";

export function CoverEditor({ imageFile, onSave, onCancel }: CoverEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [brightness, setBrightness] = useState(100); // %
  const [contrast, setContrast] = useState(100); // %
  const [activeTool, setActiveTool] = useState<Tool>("none");
  const [loading, setLoading] = useState(true);

  // Crop state
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setLoading(false);
      // Reset crop when image changes
      setCropRect(null);
    };
    img.src = URL.createObjectURL(imageFile);
    return () => URL.revokeObjectURL(img.src);
  }, [imageFile]);

  // Draw canvas whenever params change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = image;
    if (!canvas || !img) return;

    const rotated = rotation % 360;
    const isVertical = rotated === 90 || rotated === 270;
    const cw = isVertical ? img.naturalHeight : img.naturalWidth;
    const ch = isVertical ? img.naturalWidth : img.naturalHeight;

    // Fit to container
    const containerW = containerRef.current?.clientWidth || 300;
    const scale = Math.min(1, containerW / cw);
    const dw = cw * scale;
    const dh = ch * scale;

    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, dw, dh);

    // Apply rotation
    ctx.save();
    ctx.translate(dw / 2, dh / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // Apply brightness/contrast via filter
    if (brightness !== 100 || contrast !== 100) {
      const imageData = ctx.getImageData(0, 0, dw, dh);
      const data = imageData.data;
      const bFactor = brightness / 100;
      const cFactor = contrast / 100;

      for (let i = 0; i < data.length; i += 4) {
        // Brightness
        data[i] = Math.min(255, data[i] * bFactor);
        data[i + 1] = Math.min(255, data[i + 1] * bFactor);
        data[i + 2] = Math.min(255, data[i + 2] * bFactor);

        // Contrast
        data[i] = Math.min(255, ((data[i] / 255 - 0.5) * cFactor + 0.5) * 255);
        data[i + 1] = Math.min(255, ((data[i + 1] / 255 - 0.5) * cFactor + 0.5) * 255);
        data[i + 2] = Math.min(255, ((data[i + 2] / 255 - 0.5) * cFactor + 0.5) * 255);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Draw crop overlay
    if (activeTool === "crop" && cropRect) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, cropRect.x, dh); // left
      ctx.fillRect(cropRect.x + cropRect.w, 0, dw - cropRect.x - cropRect.w, dh); // right
      ctx.fillRect(cropRect.x, 0, cropRect.w, cropRect.y); // top
      ctx.fillRect(cropRect.x, cropRect.y + cropRect.h, cropRect.w, dh - cropRect.y - cropRect.h); // bottom

      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.setLineDash([]);
    }

  }, [image, rotation, brightness, contrast, activeTool, cropRect]);

  useEffect(() => {
    if (image) drawCanvas();
  }, [image, drawCanvas]);

  // Rotate
  const rotateCW = () => setRotation((r) => (r + 90) % 360);
  const rotateCCW = () => setRotation((r) => (r - 90 + 360) % 360);

  // Mouse handlers for crop
  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "crop") return;
    const pos = getCanvasPos(e);
    setCropStart(pos);
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropStart) return;
    const pos = getCanvasPos(e);
    const x = Math.min(cropStart.x, pos.x);
    const y = Math.min(cropStart.y, pos.y);
    const w = Math.abs(pos.x - cropStart.x);
    const h = Math.abs(pos.y - cropStart.y);
    setCropRect({ x, y, w, h });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Apply crop
  const applyCrop = () => {
    if (!cropRect || !canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    ctx.putImageData(imageData, 0, 0);

    setCropRect(null);
    setActiveTool("none");

    // Update image ref so further edits work on cropped version
    const newImg = new Image();
    newImg.src = canvas.toDataURL();
    setImage(newImg);
    setRotation(0);
  };

  // Handle save
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  // Reset
  const handleReset = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setActiveTool("none");
    setCropRect(null);
    // Reload original
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(imageFile);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-brand-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-sm">Memuat gambar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={rotateCCW}
          className="btn-secondary p-2 rounded-lg"
          title="Putar kiri 90°"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={rotateCW}
          className="btn-secondary p-2 rounded-lg"
          title="Putar kanan 90°"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-brand-200 mx-1" />
        <button
          type="button"
          onClick={() => {
            setActiveTool(activeTool === "crop" ? "none" : "crop");
            if (activeTool === "crop") setCropRect(null);
          }}
          className={`p-2 rounded-lg transition ${
            activeTool === "crop"
              ? "bg-brand-500 text-white"
              : "btn-secondary"
          }`}
          title="Potong (crop)"
        >
          <Crop className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "brightness" ? "none" : "brightness")}
          className={`p-2 rounded-lg transition ${
            activeTool === "brightness"
              ? "bg-brand-500 text-white"
              : "btn-secondary"
          }`}
          title="Kecerahan"
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === "contrast" ? "none" : "contrast")}
          className={`p-2 rounded-lg transition ${
            activeTool === "contrast"
              ? "bg-brand-500 text-white"
              : "btn-secondary"
          }`}
          title="Kontras"
        >
          <Contrast className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary p-2 rounded-lg text-xs"
          title="Reset ke gambar asli"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Slider controls */}
      {activeTool === "brightness" && (
        <div className="flex items-center gap-3 bg-brand-50 rounded-lg p-3">
          <Sun className="w-4 h-4 text-brand-500 shrink-0" />
          <input
            type="range"
            min={50}
            max={200}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="flex-1 h-2 accent-brand-500"
          />
          <span className="text-xs text-brand-600 w-10 text-right">{brightness}%</span>
        </div>
      )}
      {activeTool === "contrast" && (
        <div className="flex items-center gap-3 bg-brand-50 rounded-lg p-3">
          <Contrast className="w-4 h-4 text-brand-500 shrink-0" />
          <input
            type="range"
            min={50}
            max={200}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="flex-1 h-2 accent-brand-500"
          />
          <span className="text-xs text-brand-600 w-10 text-right">{contrast}%</span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-brand-200 flex items-center justify-center min-h-[200px]"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`max-w-full ${activeTool === "crop" ? "cursor-crosshair" : ""}`}
        />
      </div>

      {/* Crop hint */}
      {activeTool === "crop" && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-400 flex items-center gap-1">
            <Move className="w-3 h-3" />
            Drag untuk memilih area potong
          </p>
          <button
            type="button"
            onClick={applyCrop}
            disabled={!cropRect || cropRect.w < 20 || cropRect.h < 20}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Potong
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1 flex items-center justify-center gap-1"
        >
          <X className="w-4 h-4" />
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary flex-1 flex items-center justify-center gap-1"
        >
          <Check className="w-4 h-4" />
          Gunakan Gambar Ini
        </button>
      </div>
    </div>
  );
}
