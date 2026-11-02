// @ts-nocheck
import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value = [0],
      onValueChange,
      max = 100,
      min = 0,
      step = 1,
      disabled,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);

      onValueChange?.([newValue]);
    };

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
      <div
        className={cn(
          "relative flex w-full touch-none select-none items-center py-3",
          className,
        )}
      >
        <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full border border-slate-300 dark:border-slate-600 shadow-inner">
          {/* Progress track */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-200 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
          {/* Input slider */}
          <input
            ref={ref}
            className={cn(
              "absolute inset-0 w-full h-full cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed disabled:opacity-50 z-10",
              // Webkit (Chrome, Safari, Edge)
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-500 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-webkit-slider-track]:appearance-none [&::-webkit-slider-track]:bg-transparent [&::-webkit-slider-track]:h-full [&::-webkit-slider-track]:w-full",
              // Firefox
              "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-blue-500 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:box-sizing:border-box",
              "[&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-0 [&::-moz-range-track]:h-full [&::-moz-range-track]:w-full",
            )}
            disabled={disabled}
            max={max}
            min={min}
            step={step}
            type="range"
            value={value[0]}
            onChange={handleChange}
            {...props}
          />
        </div>
      </div>
    );
  },
);

Slider.displayName = "Slider";

export { Slider };
