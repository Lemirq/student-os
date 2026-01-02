"use client";

import * as React from "react";
import * as chrono from "chrono-node";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate, hasTime } from "@/lib/date-parser";

export interface SmartDatetimeInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  value?: Date | string | null;
  onValueChange?: (date: Date | null) => void;
  showTimeByDefault?: boolean; // Whether to show time in the display format
}

export const SmartDatetimeInput = React.forwardRef<
  HTMLInputElement,
  SmartDatetimeInputProps
>(
  (
    {
      className,
      value,
      onValueChange,
      placeholder,
      showTimeByDefault = false,
      ...props
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = React.useState("");
    const [parsedDate, setParsedDate] = React.useState<Date | null>(null);
    const [open, setOpen] = React.useState(false);
    const [showTimePicker, setShowTimePicker] = React.useState(false);
    const [timeValue, setTimeValue] = React.useState("00:00");

    // Sync internal state when external value changes
    React.useEffect(() => {
      if (value) {
        let date: Date;
        // Handle YYYY-MM-DD strings explicitly to avoid UTC conversion shifts
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          const [y, m, d] = value.split("-").map(Number);
          date = new Date(y, m - 1, d);
        } else {
          date = new Date(value);
        }

        if (!isNaN(date.getTime())) {
          const includeTime = showTimeByDefault || hasTime(date);
          setInputValue(formatDate(date, includeTime));
          setParsedDate(date);

          // Update time picker value
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          setTimeValue(`${hours}:${minutes}`);
        }
      } else {
        // value is null/undefined
      }
    }, [value, showTimeByDefault]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      setInputValue(newVal);

      if (!newVal) {
        setParsedDate(null);
        return;
      }

      const parsed = chrono.parseDate(newVal);
      setParsedDate(parsed);

      // Update time picker if time was parsed
      if (parsed && hasTime(parsed)) {
        const hours = String(parsed.getHours()).padStart(2, "0");
        const minutes = String(parsed.getMinutes()).padStart(2, "0");
        setTimeValue(`${hours}:${minutes}`);
      }
    };

    const handleBlur = () => {
      if (parsedDate) {
        onValueChange?.(parsedDate);
        const includeTime = showTimeByDefault || hasTime(parsedDate);
        setInputValue(formatDate(parsedDate, includeTime));
      } else if (inputValue === "") {
        onValueChange?.(null);
      } else {
        // Revert to original if invalid
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            const includeTime = showTimeByDefault || hasTime(date);
            setInputValue(formatDate(date, includeTime));
          }
        } else {
          setInputValue("");
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBlur(); // Trigger save on Enter
      }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (!date) {
        onValueChange?.(null);
        setInputValue("");
        setParsedDate(null);
        setOpen(false);
        return;
      }

      // If time picker is shown, combine calendar date with time picker time
      if (showTimePicker) {
        const [hours, minutes] = timeValue.split(":").map(Number);
        date.setHours(hours, minutes, 0, 0);
      }

      onValueChange?.(date);
      const includeTime = showTimeByDefault || hasTime(date);
      setInputValue(formatDate(date, includeTime));
      setParsedDate(date);

      if (!showTimePicker) {
        setOpen(false);
      }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      setTimeValue(newTime);

      // Update the parsed date with new time
      if (parsedDate) {
        const [hours, minutes] = newTime.split(":").map(Number);
        const updatedDate = new Date(parsedDate);
        updatedDate.setHours(hours, minutes, 0, 0);
        setParsedDate(updatedDate);
        onValueChange?.(updatedDate);
        setInputValue(formatDate(updatedDate, true));
      }
    };

    const toggleTimePicker = () => {
      setShowTimePicker(!showTimePicker);
    };

    return (
      <div className="relative w-full flex items-center">
        <Input
          ref={ref}
          type="text"
          className={cn("pr-20 w-full", className)}
          placeholder={placeholder || "e.g. tomorrow at 5pm"}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-9 h-7 w-7 text-muted-foreground hover:bg-transparent"
              type="button"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value ? new Date(value) : undefined}
              onSelect={handleCalendarSelect}
              classNames={{
                root: "w-full",
              }}
            />
            {showTimePicker && (
              <div className="border-t p-3">
                <label className="text-xs font-medium mb-2 block">Time</label>
                <Input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="w-full"
                />
              </div>
            )}
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-transparent"
          type="button"
          onClick={toggleTimePicker}
        >
          <Clock className="h-4 w-4" />
        </Button>
      </div>
    );
  },
);

SmartDatetimeInput.displayName = "SmartDatetimeInput";
