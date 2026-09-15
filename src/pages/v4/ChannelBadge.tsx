import React from "react";
import { User } from "lucide-react";
import type { BookingChannel } from "./mockData";

const ChannelBadge: React.FC<{ channel: BookingChannel }> = ({ channel }) => {
  if (channel === "airbnb") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-500">
        A
      </span>
    );
  }
  if (channel === "booking") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">
        B.
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-500">
      <User className="h-3.5 w-3.5" />
    </span>
  );
};

export default ChannelBadge;
