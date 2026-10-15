import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}

export default function PinKeypad({ value, onChange, disabled = false, label }: PinKeypadProps) {
  const addDigit = (digit: string) => {
    if (!disabled && value.length < 4) onChange(value + digit);
  };

  return (
    <div role="group" aria-label={label} tabIndex={disabled ? -1 : 0}
      className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#255f85] focus-visible:ring-offset-4"
      onKeyDown={event => {
        if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^\d$/.test(event.key)) { event.preventDefault(); addDigit(event.key); }
        if (event.key === "Backspace") { event.preventDefault(); onChange(value.slice(0, -1)); }
        if (event.key === "Delete") { event.preventDefault(); onChange(""); }
      }}>
      <p className="text-center text-sm font-medium text-slate-600">{label}</p>
      <div className="my-6 flex justify-center gap-5" role="status" aria-label={`${value.length} chiffres saisis sur 4`}>
        {[0, 1, 2, 3].map(index => (
          <span key={index} aria-hidden="true" className={`h-4 w-4 rounded-full border-2 transition-colors ${index < value.length ? "border-[#255f85] bg-[#255f85]" : "border-slate-300 bg-white"}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
          <Button key={digit} type="button" variant="outline" disabled={disabled || value.length === 4}
            onClick={() => addDigit(digit)} aria-label={`Chiffre ${digit}`}
            className="h-20 rounded-2xl border-slate-200 bg-slate-50 text-3xl font-semibold text-slate-900 shadow-sm hover:border-[#255f85]/30 hover:bg-[#255f85]/10 active:scale-95 disabled:opacity-60">
            {digit}
          </Button>
        ))}
        <Button type="button" variant="ghost" disabled={disabled || !value.length} onClick={() => onChange("")}
          className="h-20 rounded-2xl text-xs text-slate-500" aria-label="Effacer tout le code">Effacer</Button>
        <Button type="button" variant="outline" disabled={disabled || value.length === 4} onClick={() => addDigit("0")}
          className="h-20 rounded-2xl border-slate-200 bg-slate-50 text-3xl font-semibold text-slate-900 shadow-sm hover:border-[#255f85]/30 hover:bg-[#255f85]/10 active:scale-95 disabled:opacity-60" aria-label="Chiffre 0">0</Button>
        <Button type="button" variant="ghost" disabled={disabled || !value.length} onClick={() => onChange(value.slice(0, -1))}
          className="h-20 rounded-2xl text-slate-600 hover:bg-slate-100 active:scale-95" aria-label="Effacer le dernier chiffre"><Delete className="h-7 w-7" /></Button>
      </div>
    </div>
  );
}
