import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";

import { formatVndInput, parseVndInput } from "./vndInputFormat";

interface VndInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
}

export default function VndInput({ value, onValueChange, ...props }: VndInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const formatted = formatVndInput(value);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;
    const digitsBeforeCaret = pendingCaret.current;
    let position = 0;
    let digits = 0;
    while (position < formatted.length && digits < digitsBeforeCaret) {
      if (/\d/.test(formatted[position])) digits++;
      position++;
    }
    inputRef.current.setSelectionRange(position, position);
    pendingCaret.current = null;
  });

  return <input {...props} ref={inputRef} type="text" inputMode="numeric" value={formatted}
    onKeyDown={(event) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const input = event.currentTarget;
      const start = input.selectionStart ?? 0;
      if (start !== input.selectionEnd) return;
      // Delete a digit together with its separator so Backspace/Delete never gets stuck.
      if (event.key === "Backspace" && start > 1 && input.value[start - 1] === ".") {
        input.setSelectionRange(start - 2, start);
      } else if (event.key === "Delete" && input.value[start] === ".") {
        input.setSelectionRange(start, start + 2);
      }
    }}
    onChange={(event) => {
      const input = event.currentTarget;
      pendingCaret.current = Math.min(12, input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length);
      onValueChange(parseVndInput(input.value));
    }} />;
}
