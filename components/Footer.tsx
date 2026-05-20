"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  MessageSquare,
  Camera,
  Briefcase,
  Play,
  ArrowRight,
  CheckCircle,
  MapPin,
  Mail,
} from "lucide-react";

const footerLinks = {
  Company: [
    { label: "About Us", href: "/info/about-us" },
    { label: "Careers", href: "/info/careers" },
    { label: "Press & Media", href: "/info/press-media" },
    { label: "Blog", href: "/info/blog" },
    { label: "Contact Us", href: "/contact" },
  ],
  Resources: [
    { label: "Help Center", href: "/support" },
    { label: "For Organizers", href: "/info/for-organizers" },
    { label: "Partner Program", href: "/info/partner-program" },
    { label: "API Documentation", href: "/info/api-documentation" },
    { label: "Status Page", href: "/info/status-page" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/info/privacy-policy" },
    { label: "Terms of Service", href: "/info/terms-of-service" },
    { label: "Cookie Settings", href: "/info/cookie-settings" },
    { label: "Accessibility", href: "/info/accessibility" },
    { label: "Refund Policy", href: "/info/refund-policy" },
  ],
};

const socials = [
  { Icon: MessageSquare, href: "#", label: "Twitter / X", color: "hover:text-sky-400" },
  { Icon: Camera, href: "#", label: "Instagram", color: "hover:text-pink-400" },
  { Icon: Briefcase, href: "#", label: "LinkedIn", color: "hover:text-blue-400" },
  { Icon: Play, href: "#", label: "YouTube", color: "hover:text-red-400" },
];

const trustBadges = [
  { label: "SSL Secured", sub: "256-bit encryption" },
  { label: "SOC 2 Compliant", sub: "Enterprise-grade security" },
  { label: "PCI DSS", sub: "Level 1 certified" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSubscribed(true);
    setSubLoading(false);
  }

  return (
    <footer className="border-t border-white/8 bg-[#060f17] mt-0">
      {/* Newsletter band */}
      <div className="border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-md">
              <h3 className="text-white font-extrabold text-xl tracking-tight mb-2">
                Stay in the loop
              </h3>
              <p className="text-white/50 text-sm">
                Get the best events delivered to your inbox before they sell out.
                No spam — unsubscribe anytime.
              </p>
            </div>

            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#ff5a5f]/10 border border-[#ff5a5f]/25"
              >
                <CheckCircle className="w-5 h-5 text-[#ff5a5f]" />
                <span className="text-[#ff5a5f] font-semibold text-sm">
                  You're subscribed — welcome aboard!
                </span>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto"
              >
                <div className="relative flex-1 sm:w-72">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#112240] border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={subLoading}
                  className="btn-scale flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff5a5f] text-[#112240] font-bold text-sm hover:bg-[#ff5a5f]/90 hover:shadow-lg hover:shadow-[#ff5a5f]/25 disabled:opacity-70 transition-all whitespace-nowrap"
                >
                  {subLoading ? (
                    <span className="w-4 h-4 border-2 border-[#112240]/30 border-t-[#112240] rounded-full animate-spin" />
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-5 w-fit">
              <div className="w-8 h-8 rounded-lg bg-[#ff5a5f] flex items-center justify-center">
                <Ticket className="w-5 h-5 text-[#112240]" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Event<span className="text-[#ff5a5f]">Nest</span>
              </span>
            </Link>

            <p className="text-white/45 text-sm leading-relaxed mb-6 max-w-xs">
              The modern platform for discovering, creating, and selling tickets
              to live experiences — concerts, conferences, art fairs, and beyond.
            </p>

            <div className="flex items-center gap-1.5 text-white/35 text-xs mb-6">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span>548 Market St, San Francisco, CA 94104</span>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2">
              {socials.map(({ Icon, href, label, color }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/40 ${color} hover:border-white/20 hover:bg-white/8 transition-all`}
                  style={{ transform: "none" }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-semibold text-sm mb-4 tracking-tight">
                {section}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-white/45 text-sm hover:text-[#ff5a5f] transition-colors"
                      style={{ display: "inline-block", transform: "none" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Trust badges + copyright bar */}
      <div className="border-t border-white/6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-5">
          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-4">
            {trustBadges.map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#ff5a5f]" />
                <div>
                  <span className="text-white/60 text-xs font-medium">{b.label}</span>
                  <span className="text-white/25 text-xs ml-1">· {b.sub}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/25 text-xs text-center">
            © 2026 EventNest, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
