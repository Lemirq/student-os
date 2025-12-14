"use client";

import * as React from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SmartDatetimeInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> {
  value?: Date | string | null;
  onValueChange?: (date: Date | null) => void;
}

export const SmartDatetimeInput = React.forwardRef<
  HTMLInputElement,
  SmartDatetimeInputProps
>(({ className, value, onValueChange, placeholder, ...props }, ref) => {
  const [inputValue, setInputValue] = React.useState("");
  const [parsedDate, setParsedDate] = React.useState<Date | null>(null);
  const [open, setOpen] = React.useState(false);

  // Sync internal state when external value changes
  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setInputValue(format(date, "MMM d, yyyy"));
        setParsedDate(date);
      }
    } else {
      // value is null/undefined
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setInputValue(newVal);

    if (!newVal) {
      setParsedDate(null);
      return;
    }

    const parsed = chrono.parseDate(newVal);
    setParsedDate(parsed);
  };

  const handleBlur = () => {
    if (parsedDate) {
      onValueChange?.(parsedDate);
      setInputValue(format(parsedDate, "MMM d, yyyy"));
    } else if (inputValue === "") {
      onValueChange?.(null);
    } else {
      // Revert to original if invalid
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setInputValue(format(date, "MMM d, yyyy"));
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
    const selectedDate = date || null;
    onValueChange?.(selectedDate);
    setInputValue(selectedDate ? format(selectedDate, "MMM d, yyyy") : "");
    setParsedDate(selectedDate);
    setOpen(false);
  };

  return (
    <div className="relative w-full flex items-center">
      <Input
        ref={ref}
        type="text"
        className={cn("pr-10 w-full", className)}
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
            className="absolute right-1 h-7 w-7 text-muted-foreground hover:bg-transparent"
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
        </PopoverContent>
      </Popover>
    </div>
  );
});

SmartDatetimeInput.displayName = "SmartDatetimeInput";
