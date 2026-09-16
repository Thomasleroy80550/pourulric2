import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, KeyRound, Wifi, Home } from "lucide-react";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import { PROPERTY_IMG, useV4Rooms } from "./v4-data";

const RoomsV4: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { data: rooms, isLoading } = useV4Rooms();

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Mes logements</h1>
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-32 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && (rooms ?? []).length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Home className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              Aucun logement configuré.
            </p>
          </div>
        )}

        {(rooms ?? []).map((room) => (
          <div key={room.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <img
              src={PROPERTY_IMG}
              alt=""
              className="h-36 w-full object-cover"
            />
            <div className="space-y-3 p-4">
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {room.room_name}
                </p>
                {(room.property_type || profile?.property_address) && (
                  <p className="text-sm text-slate-500">
                    {[room.property_type, profile?.property_address]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>

              {(room.keybox_code || room.wifi_code) && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {room.keybox_code && (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">Boîte à clés</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {room.keybox_code}
                        </p>
                      </div>
                    </div>
                  )}
                  {room.wifi_code && (
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                        <Wifi className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs text-slate-400">
                          Wifi{room.wifi_ssid ? ` · ${room.wifi_ssid}` : ""}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {room.wifi_code}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                La gestion de ce logement est assurée par Hello Keys : annonces,
                voyageurs, ménage et maintenance.
              </div>
            </div>
          </div>
        ))}
      </div>
    </V4Layout>
  );
};

export default RoomsV4;
