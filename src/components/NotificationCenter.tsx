"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  to?: string;
  badge?: string;
};

type NotificationCenterProps = {
  items: NotificationItem[];
  title?: string;
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ items, title = "Notifications" }) => {
  if (!items || items.length === 0) return null;

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Badge variant="default">{items.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((n) => (
          <div
            key={n.id}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm md:text-base">{n.title}</p>
                {n.badge && <Badge variant="secondary" className="text-xs">{n.badge}</Badge>}
              </div>
              {n.description && (
                <p className="text-xs md:text-sm text-muted-foreground">
                  {n.description}
                </p>
              )}
            </div>
            {n.to && (
              <div className="shrink-0">
                <Button asChild size="sm" variant="default">
                  <Link to={n.to}>{n.ctaLabel || "Ouvrir"}</Link>
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;