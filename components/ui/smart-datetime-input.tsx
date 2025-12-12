import * as React from "react";
import * as chrono from "chrono-node";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Initialize input value from prop
  React.useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Only update input text if it's empty or we're syncing from external change
        // We don't want to overwrite user typing if they are typing "next fri..."
        if (!inputValue) {
          setInputValue(format(date, "MMM d, yyyy"));
        }
      }
    }
  }, [value]); // careful with dependency loop if inputValue changes value

  // Better approach: value prop drives the committed state.
  // inputValue is local.
  // If value changes externally, we update inputValue?
  // For now, let's just initialize.

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
      // If we couldn't parse it, maybe revert to original value or keep as is?
      // Let's try to see if it's already a valid date string that chrono missed (unlikely)
      // or just leave it for the user to fix.
      // If we revert:
      if (value) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setInputValue(format(date, "MMM d, yyyy"));
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          className={cn("pr-10", className)}
          placeholder={placeholder || "e.g. tomorrow at 5pm"}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <CalendarIcon className="h-4 w-4" />
        </div>
      </div>
      {/* {inputValue && parsedDate && (
        <div className="absolute top-full left-0 mt-1 text-xs text-muted-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-1.5 rounded-md border shadow-sm z-10">
            Detected: <span className="font-medium text-foreground">{format(parsedDate, "EEE, MMM d, yyyy h:mm a")}</span>
        </div>
      )} */}
    </div>
  );
});

SmartDatetimeInput.displayName = "SmartDatetimeInput";
