"use client";

import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-lg border-dashed">
        <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
          <Image
            src="/logo_transparent.png"
            alt="SaveSync"
            width={100}
            height={100}
            className="opacity-50"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Under Construction</h1>
            <p className="text-muted-foreground">
              Welcome, {user?.displayName || "User"}! We&apos;re building something great.
            </p>
            <p className="text-sm text-muted-foreground">
              Check back soon for updates.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
            <span>Work in progress</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
