import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { CheckCircle2, Wrench, Send, User, Archive } from 'lucide-react';

export type FeedbackType = 'taken_charge' | 'resolved' | 'message' | 'assigned' | 'archived';

const CONFIG: Record<FeedbackType, { icon: typeof Wrench; color: string; label: string }> = {
  taken_charge: { icon: Wrench, color: 'bg-blue-600', label: 'Pris en charge !' },
  resolved: { icon: CheckCircle2, color: 'bg-green-600', label: 'Résolu ! 🎉' },
  message: { icon: Send, color: 'bg-primary', label: 'Message envoyé !' },
  assigned: { icon: User, color: 'bg-amber-600', label: 'Assigné au propriétaire !' },
  archived: { icon: Archive, color: 'bg-gray-600', label: 'Archivé !' },
};

interface ReportActionFeedbackProps {
  type: FeedbackType;
  label?: string;
  onDone: () => void;
}

const ReportActionFeedback = ({ type, label, onDone }: ReportActionFeedbackProps) => {
  const [dims] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const timer = setTimeout(onDone, 1900);
    return () => clearTimeout(timer);
  }, [onDone]);

  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      {type === 'resolved' && (
        <Confetti width={dims.w} height={dims.h} numberOfPieces={240} recycle={false} gravity={0.25} />
      )}
      <div className="flex flex-col items-center gap-4 duration-300 animate-in fade-in zoom-in">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className={`absolute inset-0 animate-ping rounded-full ${cfg.color} opacity-20`} />
          <span className={`absolute inset-3 animate-pulse rounded-full ${cfg.color} opacity-10`} />
          <div
            className={`relative flex h-20 w-20 animate-bounce items-center justify-center rounded-full ${cfg.color} text-white shadow-lg`}
          >
            <Icon className="h-9 w-9" />
          </div>
        </div>
        <p className="text-lg font-semibold">{label || cfg.label}</p>
      </div>
    </div>
  );
};

export default ReportActionFeedback;
