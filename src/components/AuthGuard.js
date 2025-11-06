"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/reset-password"]);

function isPublicRoute(pathname) {
  if (!pathname) return false;
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return Array.from(PUBLIC_ROUTES).some((route) => pathname.startsWith(`${route}/`));
}

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = useMemo(() => isPublicRoute(pathname ?? "/"), [pathname]);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      const redirectParam = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirectParam}`);
      return;
    }

    if (user && isPublic) {
      router.replace("/");
    }
  }, [user, loading, isPublic, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-2">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500">Checking authentication…</p>
        </div>
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }

  return children;
}
