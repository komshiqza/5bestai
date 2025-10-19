import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export function ImageComparisonSlider({ beforeImage, afterImage, className = "" }: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleClick = (e: React.MouseEvent) => {
    handleMove(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none cursor-ew-resize ${className}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      data-testid="container-comparison-slider"
    >
      {/* After Image (Background) */}
      <div className="w-full h-auto">
        <img
          src={afterImage}
          alt="After"
          className="w-full h-auto block"
          draggable={false}
          data-testid="img-after"
        />
      </div>

      {/* Before Image (Foreground with clip) */}
      <div
        className="absolute top-0 left-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="w-full h-auto block"
          draggable={false}
          data-testid="img-before"
        />
      </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        data-testid="handle-slider"
      >
        {/* Center Circle with Arrows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-300">
          <ChevronLeft className="w-4 h-4 text-gray-700 absolute left-1" />
          <ChevronRight className="w-4 h-4 text-gray-700 absolute right-1" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded backdrop-blur-sm">
        Original
      </div>
      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded backdrop-blur-sm">
        Enhanced
      </div>
    </div>
  );
}
