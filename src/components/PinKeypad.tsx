import { Delete, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
}

const digits = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

const digitClassName = "group relative aspect-square h-auto w-full flex-col gap-0 rounded-full border border-white bg-gradient-to-b from-white to-[#fafbf9] p-0 font-normal text-[#173f47] shadow-[0_5px_16px_-6px_rgba(23,63,71,0.16),inset_0_1px_0_rgba(255,255,255,1)] transition-all duration-200 hover:border-[#255f85]/15 hover:bg-[#edf4f4] hover:shadow-[0_7px_20px_-6px_rgba(23,63,71,0.24)] active:scale-[0.92] active:border-[#255f85] active:from-[#255f85] active:to-[#19435f] active:text-white disabled:opacity-70 motion-reduce:transition-none";

export default function PinKeypad({ value, onChange, disabled = false, label }: PinKeypadProps) {
  const addDigit = (digit: string) => {
    if (!disabled && value.length < 4) onChange(value + digit);
  };

  return (
    <div role="group" aria-label={label} tabIndex={disabled ? -1 : 0}
      className="rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[#255f85] focus-visible:ring-offset-4"
      onKeyDown={event => {
        if (disabled || event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^\d$/.test(event.key)) { event.preventDefault(); addDigit(event.key); }
        if (event.key === "Backspace") { event.preventDefault(); onChange(value.slice(0, -1)); }
        if (event.key === "Delete") { event.preventDefault(); onChange(""); }
      }}>
      <p className="text-center text-[13px] font-medium tracking-wide text-[#6b7d81]">{label}</p>
      <div className="mb-8 mt-5 flex justify-center gap-3" role="status" aria-label={`${value.length} chiffres saisis sur 4`}>
        {[0, 1, 2, 3].map(index => (
          <span key={index} aria-hidden="true" className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-200 motion-reduce:transition-none ${index < value.length ? "border-[#255f85]/20 bg-[#255f85]/[0.06] shadow-[0_2px_8px_rgba(37,95,133,0.05)]" : "border-[#dfe6e4] bg-white/40"}`}>
            <span className={`rounded-full transition-all duration-200 motion-reduce:transition-none ${index < value.length ? "h-2.5 w-2.5 scale-100 bg-[#255f85]" : "h-1.5 w-1.5 scale-75 bg-[#c9d5d4]"}`} />
          </span>
        ))}
      </div>
      <div className="mx-auto grid w-full max-w-[292px] grid-cols-3 gap-x-5 gap-y-3">
        {digits.map(({ digit, letters }) => (
          <Button key={digit} type="button" variant="ghost" disabled={disabled || value.length === 4}
            onClick={() => addDigit(digit)} aria-label={`Chiffre ${digit}`} className={digitClassName}>
            <span className="text-[36px] font-light leading-[1.15] tracking-tight tabular-nums">{digit}</span>
            <span aria-hidden="true" className="mt-1 h-3 text-[8px] font-medium tracking-[0.22em] text-[#91a3a5] group-active:text-white/70">{letters}</span>
          </Button>
        ))}
        <Button type="button" variant="ghost" disabled={disabled || !value.length} onClick={() => onChange("")}
          className="aspect-square h-auto w-full rounded-full p-0 text-[#8a9b9e] transition-all hover:bg-white/70 hover:text-[#255f85] active:scale-90" aria-label="Effacer tout le code"><RotateCcw className="h-5 w-5" strokeWidth={1.5} /></Button>
        <Button type="button" variant="ghost" disabled={disabled || value.length === 4} onClick={() => addDigit("0")}
          className={digitClassName} aria-label="Chiffre 0"><span className="text-[36px] font-light leading-[1.15] tracking-tight tabular-nums">0</span><span aria-hidden="true" className="mt-1 h-3 text-[9px] text-[#91a3a5] group-active:text-white/70">+</span></Button>
        <Button type="button" variant="ghost" disabled={disabled || !value.length} onClick={() => onChange(value.slice(0, -1))}
          className="aspect-square h-auto w-full rounded-full p-0 text-[#8a9b9e] transition-all hover:bg-white/70 hover:text-[#255f85] active:scale-90" aria-label="Effacer le dernier chiffre"><Delete className="h-6 w-6" strokeWidth={1.5} /></Button>
      </div>
    </div>
  );
}
