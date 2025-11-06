"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Boxes,
  ClipboardPlus,
  ArrowDownCircle,
  ArrowUpCircle,
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

const MAIN_LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/reports", label: "Reports", Icon: BarChart3 },
];

const MANAGE_LINKS = [
  { href: "/inventory", label: "Inventory" },
  { href: "/categories", label: "Categories" },
  { href: "/companies", label: "Companies" },
];

const ACTION_LINKS = [
  { href: "/add-item", label: "Add Item", Icon: ClipboardPlus, accent: "text-emerald-400" },
  { href: "/stock-in", label: "Stock In", Icon: ArrowDownCircle, accent: "text-blue-400" },
  { href: "/stock-out", label: "Stock Out", Icon: ArrowUpCircle, accent: "text-rose-400" },
];

const baseLinkClass =
  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

function NavLink({ href, label, Icon, active, onNavigate }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={[
        baseLinkClass,
        Icon ? "pr-5" : "",
        active
          ? "bg-white/10 text-white shadow-md shadow-blue-500/10"
          : "text-slate-200 hover:text-white hover:bg-white/10",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      <span>{label}</span>
    </Link>
  );
}

function DesktopDropdown({
  label,
  links,
  isActive,
  onNavigate,
  buttonClassName = "",
  badge,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      window.addEventListener("keydown", closeOnEscape);
    }

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  const openDropdown = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      hoverTimeoutRef.current = null;
    }, 180);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={openDropdown}
      onMouseLeave={scheduleClose}
      onFocusCapture={openDropdown}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        className={`group ${baseLinkClass} text-slate-200 hover:text-white hover:bg-white/10 ${
          open ? "bg-white/10 text-white" : ""
        } ${buttonClassName}`}
        onClick={() => {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setOpen((prev) => !prev);
        }}
      >
        <span className="flex items-center gap-2">
          <span>{label}</span>
          {badge && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-3 w-60 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-blue-900/30 backdrop-blur-md">
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const LinkIcon = link.Icon;
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    setOpen(false);
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    onNavigate?.();
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {LinkIcon ? (
                    <LinkIcon
                      className={`h-4 w-4 ${link.accent ?? "text-slate-400"}`}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
                  )}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLinkGroup({ title, links, isActive, onNavigate }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 flex flex-col gap-2">
        {links.map((link) => {
          const LinkIcon = link.Icon;
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {LinkIcon ? (
                <LinkIcon
                  className={`h-4 w-4 ${link.accent ?? "text-slate-400"}`}
                  aria-hidden="true"
                />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
              )}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AuthButtons({ onClose }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        onClick={onClose}
        className="rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition-all hover:text-white"
      >
        <span className="flex items-center gap-2">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Sign in
        </span>
      </Link>
      <Link
        href="/signup"
        onClick={onClose}
        className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
      >
        <span className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Sign up
        </span>
      </Link>
    </div>
  );
}

function UserMenu({ user, onSignOut, signingOut }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    if (!open) return;

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="true"
        aria-expanded={open}
        className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-left text-sm font-semibold text-slate-100 transition-all hover:border-blue-400/40 hover:bg-blue-500/10"
      >
  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-400 text-base font-bold text-white shadow-inner shadow-blue-900/40">
          {initials}
        </span>
        <span className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium uppercase tracking-wide text-blue-200/90">
            Account
          </span>
          <span className="text-sm font-semibold text-slate-100">
            {user?.email?.split("@")[0] ?? "Guest"}
          </span>
        </span>
        <ChevronDown
          className={`hidden sm:block h-4 w-4 text-slate-300 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-blue-900/30 backdrop-blur">
          <div className="px-5 pb-4 pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-100">
              {user?.email}
            </p>
          </div>
          <div className="border-t border-white/10 bg-slate-950/80 px-5 py-4">
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, signOut, loading } = useAuth();

  const closeMenu = () => setOpen(false);
  const toggleMenu = () => setOpen((state) => !state);

  const isActive = (href) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
      router.push("/login");
    } finally {
      setSigningOut(false);
      closeMenu();
    }
  };

  const manageLinks = MANAGE_LINKS;

  return (
  <nav className="border-b border-white/5 bg-linear-to-r from-[#050b1f] via-[#0d1735] to-[#132960] text-slate-200 shadow-lg shadow-blue-900/25 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-100 transition-all hover:text-white"
              onClick={closeMenu}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600/80 to-indigo-500/80 text-blue-100 shadow-inner shadow-blue-900/40">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="flex flex-col items-start leading-tight text-left">
                <span className="text-[11px] font-semibold uppercase tracking-[0.5em] text-blue-200/80">
                  Stock
                </span>
                <span className="mt-2 flex items-center gap-3 text-xl">
                  <span className="inline-flex items-center gap-2 font-bold text-white">
                    Management
                    <span className="h-0.5 w-8 rounded-full bg-blue-400/80" aria-hidden="true" />
                  </span>
                  <span className="font-light text-slate-300">System</span>
                </span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-3">
              {MAIN_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  {...link}
                  active={isActive(link.href)}
                  onNavigate={closeMenu}
                />
              ))}
              <DesktopDropdown
                label="Manage"
                links={manageLinks}
                isActive={isActive}
                onNavigate={closeMenu}
              />
              <DesktopDropdown
                label="Actions"
                links={ACTION_LINKS}
                isActive={isActive}
                onNavigate={closeMenu}
                buttonClassName="bg-blue-500/10 text-blue-100 hover:bg-blue-500/20"
                badge="Quick"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="hidden lg:block h-9 w-px bg-white/10" aria-hidden="true" />
            {!loading && user && (
              <UserMenu user={user} onSignOut={handleSignOut} signingOut={signingOut} />
            )}
            {!loading && !user && <AuthButtons onClose={closeMenu} />}
          </div>

          <div className="flex items-center gap-3 md:hidden">
            {!loading && !user && <AuthButtons onClose={closeMenu} />}
            <button
              onClick={toggleMenu}
              aria-label="Toggle menu"
              className="rounded-2xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-white/10 pb-6">
            <div className="flex flex-col gap-6 pt-6">
              <MobileLinkGroup
                title="Overview"
                links={MAIN_LINKS}
                isActive={isActive}
                onNavigate={closeMenu}
              />
              <MobileLinkGroup
                title="Manage"
                links={manageLinks}
                isActive={isActive}
                onNavigate={closeMenu}
              />
              <MobileLinkGroup
                title="Quick Actions"
                links={ACTION_LINKS}
                isActive={isActive}
                onNavigate={closeMenu}
              />

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
                <div className="mt-3 flex flex-col gap-3">
                  {!loading && user && (
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Signed in as</p>
                      <p className="mt-1 break-all font-semibold text-white">{user.email}</p>
                    </div>
                  )}

                  {!loading && user && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  )}

                  {!loading && !user && <AuthButtons onClose={closeMenu} />}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}