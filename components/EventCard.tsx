"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users } from "lucide-react";
import { Event } from "@/data/mockData";

const categoryColors: Record<string, { pill: string; glow: string }> = {
  Music:      { pill: "bg-purple-500/15 text-purple-300 border-purple-500/20",  glow: "rgba(168,85,247,0.15)"  },
  Technology: { pill: "bg-blue-400/15 text-blue-300 border-blue-400/20",        glow: "rgba(96,165,250,0.15)"  },
  Arts:       { pill: "bg-pink-500/15 text-pink-300 border-pink-500/20",         glow: "rgba(236,72,153,0.15)"  },
  Business:   { pill: "bg-amber-500/15 text-amber-300 border-amber-500/20",      glow: "rgba(245,158,11,0.15)"  },
  Sports:     { pill: "bg-orange-500/15 text-orange-300 border-orange-500/20",   glow: "rgba(249,115,22,0.15)"  },
  Food:       { pill: "bg-red-500/15 text-red-300 border-red-500/20",            glow: "rgba(239,68,68,0.15)"   },
  College:    { pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", glow: "rgba(16,185,129,0.15)" },
};

const fallbackColors = { pill: "bg-white/8 text-white/60 border-white/10", glow: "rgba(255,90,95,0.10)" };

interface EventCardProps {
  event: Event;
  index?: number;
}

export default function EventCard({ event, index = 0 }: EventCardProps) {
  const dateObj  = new Date(event.date);
  const day      = dateObj.toLocaleDateString("en-US", { day: "numeric" });
  const month    = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const formatted = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const { pill, glow } = categoryColors[event.category] ?? fallbackColors;
  const soldPct = event.ticketsAvailable != null
    ? Math.max(0, Math.min(100, 100 - (event.ticketsAvailable / (event.ticketsAvailable + 20)) * 100))
    : 0;
  const almostSoldOut = event.ticketsAvailable != null && event.ticketsAvailable <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.42, delay: index * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="h-full"
    >
      <Link href={`/event/${event.id}`} className="group block h-full" tabIndex={0}>
        <motion.div
          whileHover={{ y: -5, boxShadow: `0 20px 48px ${glow}, 0 0 0 1px rgba(255,90,95,0.2)` }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="h-full rounded-2xl overflow-hidden bg-[#112240] border border-white/8 transition-colors duration-300 group-hover:border-[#ff5a5f]/30"
        >
          {/* ── Image ── */}
          <div className="relative h-48 overflow-hidden flex-shrink-0">
            <motion.img
              src={event.imageUrl}
              alt={event.title}
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#112240]/90 via-[#112240]/20 to-transparent" />

            {/* Date badge */}
            <div className="absolute top-3 left-3 flex flex-col items-center justify-center w-11 h-12 rounded-xl bg-[#ff5a5f] shadow-lg shadow-[#ff5a5f]/30">
              <span className="text-white font-extrabold text-lg leading-none">{day}</span>
              <span className="text-white/90 text-[9px] font-bold tracking-widest uppercase leading-none mt-0.5">
                {month}
              </span>
            </div>

            {/* Price badge */}
            <motion.span
              whileHover={{ scale: 1.06 }}
              className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#1a2b4b] border border-white/20 text-white text-xs font-extrabold shadow-md"
            >
              {event.price === 0 ? "Free" : `$${event.price}`}
            </motion.span>

            {/* Category pill */}
            <span className={`absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm border ${pill}`}>
              {event.category}
            </span>

            {/* Almost sold out */}
            {almostSoldOut && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-[#ff5a5f]/90 text-white text-[10px] font-bold backdrop-blur-sm"
              >
                Almost gone
              </motion.span>
            )}
          </div>

          {/* ── Content ── */}
          <div className="p-5">
            <h3 className="text-white font-bold text-base leading-snug mb-3 group-hover:text-[#ff5a5f] transition-colors duration-200 line-clamp-2 min-h-[2.8rem]">
              {event.title}
            </h3>

            <div className="flex flex-col gap-2 text-sm text-white/50 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#ff5a5f]/70 flex-shrink-0" />
                <span className="truncate">{formatted} · {event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#ff5a5f]/70 flex-shrink-0" />
                <span className="truncate">{event.city}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/6 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/35 mb-1">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {event.ticketsAvailable} left
                </span>
                <span className="text-[#ff5a5f] font-semibold group-hover:underline transition-all">
                  View Details →
                </span>
              </div>
              {event.ticketsAvailable != null && (
                <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${soldPct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.04, ease: "easeOut" }}
                    className={`h-full rounded-full ${almostSoldOut ? "bg-[#ff5a5f]" : "bg-[#ff5a5f]/50"}`}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
