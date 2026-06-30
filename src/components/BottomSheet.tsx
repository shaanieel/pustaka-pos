"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  collapsedLabel?: ReactNode;
  children: ReactNode;
  /** Height percentage when expanded (0-100) */
  expandedHeight?: number;
}

export function BottomSheet({
  isOpen,
  onClose,
  collapsedLabel,
  children,
  expandedHeight = 85,
}: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setExpanded(false);
      setDragY(0);
    }
  }, [isOpen]);

  // Lock body scroll when expanded
  useEffect(() => {
    if (expanded && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [expanded, isOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const delta = e.touches[0].clientY - startY.current;
    setDragY(delta);
  }

  function handleTouchEnd() {
    if (!dragging) return;
    setDragging(false);
    const threshold = 60;
    if (dragY < -threshold && !expanded) {
      // Swipe up → expand
      setExpanded(true);
    } else if (dragY > threshold && expanded) {
      // Swipe down → collapse
      setExpanded(false);
    }
    setDragY(0);
  }

  // Mouse support for desktop testing
  function handleMouseDown(e: React.MouseEvent) {
    startY.current = e.clientY;
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;
    function handleMouseMove(e: MouseEvent) {
      const delta = e.clientY - startY.current;
      setDragY(delta);
    }
    function handleMouseUp() {
      setDragging(false);
      const threshold = 60;
      if (dragY < -threshold && !expanded) setExpanded(true);
      else if (dragY > threshold && expanded) setExpanded(false);
      setDragY(0);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragY, expanded]);

  if (!isOpen) return null;

  const translateY = expanded
    ? dragY > 0
      ? dragY
      : 0
    : dragY < 0
    ? dragY
    : 0;

  return (
    <>
      {/* Backdrop — only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        ref={sheetRef}
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
          "transition-transform duration-300 ease-out",
          !dragging && "transition-transform",
          expanded ? "" : ""
        )}
        style={{
          transform: `translateY(${translateY}px)`,
          height: expanded ? `${expandedHeight}vh` : "auto",
          maxHeight: expandedHeight + "vh",
          touchAction: "none",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-10 h-1.5 rounded-full bg-brand-200 mb-2" />
          {collapsedLabel && !expanded && (
            <div className="w-full px-4 pb-2">{collapsedLabel}</div>
          )}
          {expanded && (
            <div className="w-full px-4 flex items-center justify-between pb-1">
              <span className="text-sm font-bold text-brand-950">Keranjang</span>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-brand-400 hover:text-brand-600 font-medium"
              >
                Tutup
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className={clsx(
            "overflow-y-auto overscroll-contain",
            expanded ? "px-4 pb-8" : "px-4 pb-3"
          )}
          style={{ maxHeight: expanded ? "calc(100% - 50px)" : "60px" }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
