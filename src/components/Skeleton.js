"use client";

export default function Skeleton({ className = "", shimmer = true }) {
  return (
    <div
      className={`rounded-xl bg-slate-200/70 ${shimmer ? "animate-pulse" : ""} ${className}`.trim()}
    />
  );
}
