// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format price (you might already have this)
export function formatPrice(amount: number) {
  return `Rs. ${amount.toLocaleString()}`;
}

// === ADD THESE TWO FUNCTIONS BELOW ===

/**
 * Formats a date string into "HH:MM" (e.g., 14:35)
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Returns human-readable time ago (e.g., "5m ago", "1h 20m ago")
 */
export function getTimeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m ago`
      : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// === Optional: Play sound for alerts ===
export const playSound = (type: "new" | "ready" = "new") => {
  const sounds = {
    new: "https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3",
    ready: "https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3",
  };

  const audio = new Audio(sounds[type]);
  audio.volume = 0.7;
  audio.play().catch(() => {});
};