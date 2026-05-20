"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Menu, X, LogOut, User, QrCode, ShieldCheck,
  ChevronDown, Calendar, Plus, HelpCircle,
  LayoutGrid, Building2, BarChart2, Zap, Search, Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { authApi, extractError } from "@/lib/api";

// ─── Currencies ──────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: "USD", symbol: "$",    label: "US Dollar",         flag: "🇺🇸" },
  { code: "AUD", symbol: "A$",   label: "Australian Dollar",  flag: "🇦🇺" },
  { code: "GBP", symbol: "£",    label: "British Pound",      flag: "🇬🇧" },
  { code: "EUR", symbol: "€",    label: "Euro",               flag: "🇪🇺" },
  { code: "CAD", symbol: "C$",   label: "Canadian Dollar",    flag: "🇨🇦" },
  { code: "PKR", symbol: "₨",   label: "Pakistani Rupee",    flag: "🇵🇰" },
  { code: "AED", symbol: "د.إ",  label: "UAE Dirham",         flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼",   label: "Saudi Riyal",        flag: "🇸🇦" },
  { code: "INR", symbol: "₹",   label: "Indian Rupee",       flag: "🇮🇳" },
  { code: "JPY", symbol: "¥",    label: "Japanese Yen",       flag: "🇯🇵" },
  { code: "SGD", symbol: "S$",   label: "Singapore Dollar",   flag: "🇸🇬" },
  { code: "MYR", symbol: "RM",   label: "Malaysian Ringgit",  flag: "🇲🇾" },
  { code: "NZD", symbol: "NZ$",  label: "NZ Dollar",          flag: "🇳🇿" },
  { code: "ZAR", symbol: "R",    label: "South African Rand", flag: "🇿🇦" },
  { code: "BRL", symbol: "R$",   label: "Brazilian Real",     flag: "🇧🇷" },
  { code: "MXN", symbol: "MX$",  label: "Mexican Peso",       flag: "🇲🇽" },
] as const;
type Currency = typeof CURRENCIES[number];

function getSavedCurrency(): Currency {
  if (typeof window === "undefined") return CURRENCIES[0];
  const saved = localStorage.getItem("en_currency");
  return CURRENCIES.find((c) => c.code === saved) ?? CURRENCIES[0];
}

// ─── Countries ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { code: "AU", flag: "🇦🇺", name: "Australia",       region: "Oceania"        },
  { code: "US", flag: "🇺🇸", name: "United States",   region: "North America"  },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom",  region: "Europe"         },
  { code: "CA", flag: "🇨🇦", name: "Canada",          region: "North America"  },
  { code: "AE", flag: "🇦🇪", name: "UAE",             region: "Middle East"    },
  { code: "PK", flag: "🇵🇰", name: "Pakistan",        region: "South Asia"     },
  { code: "DE", flag: "🇩🇪", name: "Germany",         region: "Europe"         },
  { code: "FR", flag: "🇫🇷", name: "France",          region: "Europe"         },
  { code: "IT", flag: "🇮🇹", name: "Italy",           region: "Europe"         },
  { code: "ES", flag: "🇪🇸", name: "Spain",           region: "Europe"         },
  { code: "NL", flag: "🇳🇱", name: "Netherlands",     region: "Europe"         },
  { code: "SE", flag: "🇸🇪", name: "Sweden",          region: "Europe"         },
  { code: "NO", flag: "🇳🇴", name: "Norway",          region: "Europe"         },
  { code: "CH", flag: "🇨🇭", name: "Switzerland",     region: "Europe"         },
  { code: "PT", flag: "🇵🇹", name: "Portugal",        region: "Europe"         },
  { code: "IE", flag: "🇮🇪", name: "Ireland",         region: "Europe"         },
  { code: "PL", flag: "🇵🇱", name: "Poland",          region: "Europe"         },
  { code: "BE", flag: "🇧🇪", name: "Belgium",         region: "Europe"         },
  { code: "AT", flag: "🇦🇹", name: "Austria",         region: "Europe"         },
  { code: "DK", flag: "🇩🇰", name: "Denmark",         region: "Europe"         },
  { code: "FI", flag: "🇫🇮", name: "Finland",         region: "Europe"         },
  { code: "GR", flag: "🇬🇷", name: "Greece",          region: "Europe"         },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic",  region: "Europe"         },
  { code: "RO", flag: "🇷🇴", name: "Romania",         region: "Europe"         },
  { code: "HU", flag: "🇭🇺", name: "Hungary",         region: "Europe"         },
  { code: "RU", flag: "🇷🇺", name: "Russia",          region: "Europe"         },
  { code: "UA", flag: "🇺🇦", name: "Ukraine",         region: "Europe"         },
  { code: "MX", flag: "🇲🇽", name: "Mexico",          region: "North America"  },
  { code: "BR", flag: "🇧🇷", name: "Brazil",          region: "South America"  },
  { code: "AR", flag: "🇦🇷", name: "Argentina",       region: "South America"  },
  { code: "CO", flag: "🇨🇴", name: "Colombia",        region: "South America"  },
  { code: "CL", flag: "🇨🇱", name: "Chile",           region: "South America"  },
  { code: "PE", flag: "🇵🇪", name: "Peru",            region: "South America"  },
  { code: "JP", flag: "🇯🇵", name: "Japan",           region: "Asia Pacific"   },
  { code: "CN", flag: "🇨🇳", name: "China",           region: "Asia Pacific"   },
  { code: "KR", flag: "🇰🇷", name: "South Korea",     region: "Asia Pacific"   },
  { code: "SG", flag: "🇸🇬", name: "Singapore",       region: "Asia Pacific"   },
  { code: "MY", flag: "🇲🇾", name: "Malaysia",        region: "Asia Pacific"   },
  { code: "ID", flag: "🇮🇩", name: "Indonesia",       region: "Asia Pacific"   },
  { code: "TH", flag: "🇹🇭", name: "Thailand",        region: "Asia Pacific"   },
  { code: "PH", flag: "🇵🇭", name: "Philippines",     region: "Asia Pacific"   },
  { code: "VN", flag: "🇻🇳", name: "Vietnam",         region: "Asia Pacific"   },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand",     region: "Oceania"        },
  { code: "IN", flag: "🇮🇳", name: "India",           region: "South Asia"     },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh",      region: "South Asia"     },
  { code: "LK", flag: "🇱🇰", name: "Sri Lanka",       region: "South Asia"     },
  { code: "NP", flag: "🇳🇵", name: "Nepal",           region: "South Asia"     },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia",    region: "Middle East"    },
  { code: "QA", flag: "🇶🇦", name: "Qatar",           region: "Middle East"    },
  { code: "KW", flag: "🇰🇼", name: "Kuwait",          region: "Middle East"    },
  { code: "BH", flag: "🇧🇭", name: "Bahrain",         region: "Middle East"    },
  { code: "OM", flag: "🇴🇲", name: "Oman",            region: "Middle East"    },
  { code: "JO", flag: "🇯🇴", name: "Jordan",          region: "Middle East"    },
  { code: "EG", flag: "🇪🇬", name: "Egypt",           region: "Middle East"    },
  { code: "TR", flag: "🇹🇷", name: "Turkey",          region: "Middle East"    },
  { code: "IL", flag: "🇮🇱", name: "Israel",          region: "Middle East"    },
  { code: "NG", flag: "🇳🇬", name: "Nigeria",         region: "Africa"         },
  { code: "ZA", flag: "🇿🇦", name: "South Africa",    region: "Africa"         },
  { code: "KE", flag: "🇰🇪", name: "Kenya",           region: "Africa"         },
  { code: "GH", flag: "🇬🇭", name: "Ghana",           region: "Africa"         },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia",        region: "Africa"         },
  { code: "TZ", flag: "🇹🇿", name: "Tanzania",        region: "Africa"         },
  { code: "MA", flag: "🇲🇦", name: "Morocco",         region: "Africa"         },
] as const;

type Country = typeof COUNTRIES[number];

// ─── Dropdown items ───────────────────────────────────────────────────────────
const INDUSTRY_LINKS = [
  { label: "Conferences",       href: "/explore?category=Business"   },
  { label: "Music & Concerts",  href: "/explore?category=Music"      },
  { label: "Technology",        href: "/explore?category=Technology" },
  { label: "Arts & Culture",    href: "/explore?category=Arts"       },
  { label: "Food & Drink",      href: "/explore?category=Food"       },
  { label: "Sports",            href: "/explore?category=Sports"     },
];

const HELP_LINKS = [
  { label: "Help Center",    href: "/support", icon: HelpCircle },
  { label: "For Organizers", href: "/create-event", icon: Building2  },
  { label: "API Docs",       href: "#", icon: LayoutGrid },
  { label: "Status Page",    href: "#", icon: Zap        },
];

// ─── Shared dropdown panel animation ─────────────────────────────────────────
const dropAnim = {
  initial:    { opacity: 0, y: 8, scale: 0.97 },
  animate:    { opacity: 1, y: 0, scale: 1    },
  exit:       { opacity: 0, y: 8, scale: 0.97 },
  transition: { duration: 0.13, ease: "easeOut" as const },
};

// ─── Reusable nav text-link dropdown ─────────────────────────────────────────
function NavDropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative h-full flex items-center">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-[3px] h-full px-[11px] text-[14px] font-normal text-white/80 hover:text-white transition-colors whitespace-nowrap select-none"
      >
        {label}
        <ChevronDown className={`w-[13px] h-[13px] mt-px opacity-55 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            {...dropAnim}
            className="absolute left-0 top-full mt-0 min-w-[190px] rounded-lg bg-[#0e1f3a] border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.45)] py-1 z-[100]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const [mobileOpen, setMobileOpen]           = useState(false);
  const [signInOpen, setSignInOpen]           = useState(false);
  const [currOpen,   setCurrOpen]             = useState(false);
  const [countryOpen, setCountryOpen]         = useState(false);
  const [countrySearch, setCountrySearch]     = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [currency, setCurrencyState]          = useState<Currency>(CURRENCIES[0]);
  const [resending, setResending]             = useState(false);

  const signInRef  = useRef<HTMLDivElement>(null);
  const currRef    = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user, logout, isLoading, accessToken } = useAuth();
  const isOrganizer = user?.role === "organizer" || user?.role === "admin";
  const isAttendee = user?.role === "attendee";

  useEffect(() => { setCurrencyState(getSavedCurrency()); }, []);

  // Global outside-click handler
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (signInRef.current  && !signInRef.current.contains(e.target as Node))  setSignInOpen(false);
      if (currRef.current    && !currRef.current.contains(e.target as Node))    setCurrOpen(false);
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setCountryOpen(false);
        setCountrySearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem("en_currency", c.code);
    setCurrOpen(false);
    toast.success(`Currency: ${c.code} ${c.symbol}`);
  }

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.region.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  const grouped: Record<string, typeof COUNTRIES[number][]> = {};
  for (const c of filteredCountries) {
    if (!grouped[c.region]) grouped[c.region] = [];
    grouped[c.region].push(c);
  }

  const firstName = user?.name?.split(" ")[0] ?? "";

  // ── Helper: dropdown item link ──────────────────────────────────────────────
  const DropLink = ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-[9px] text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
    >
      {children}
    </Link>
  );

  return (
    <>
    <header className="sticky top-0 z-50 w-full" style={{ background: "#1a2b4b", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="max-w-[1440px] mx-auto px-5 h-[52px] flex items-center">

        {/* ── Logo ──────────────────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-[7px] flex-shrink-0 mr-3 group">
          <div className="w-[26px] h-[26px] rounded-[6px] bg-[#ff5a5f] flex items-center justify-center shadow-[0_0_10px_rgba(255,90,95,0.35)]">
            <svg viewBox="0 0 32 32" fill="none" width="15" height="15">
              <path d="M5 20.5 Q16 29 27 20.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
              <path d="M5 20.5 Q8 15.5 12.5 17"  stroke="#fff" strokeWidth="2"   strokeLinecap="round" fill="none"/>
              <path d="M27 20.5 Q24 15.5 19.5 17" stroke="#fff" strokeWidth="2"   strokeLinecap="round" fill="none"/>
              <path d="M16 5 L21.5 13 L16 16.5 L10.5 13 Z" fill="#fff"/>
              <circle cx="10.5" cy="13" r="1.4" fill="#ff5a5f"/>
              <circle cx="21.5" cy="13" r="1.4" fill="#ff5a5f"/>
            </svg>
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight leading-none">
            Event<span className="text-[#ff5a5f]">Nest</span>
          </span>
        </Link>

        {/* ── Vertical divider after logo ────────────────────────────────────── */}
        <div className="hidden lg:block w-px h-[20px] bg-white/[0.12] mx-3 flex-shrink-0" />

        {/* ── Desktop Left Nav ───────────────────────────────────────────────── */}
        <nav className="hidden lg:flex items-center h-full flex-1 min-w-0">

          {/* Features */}
          <Link
            href="/#features"
            className="flex items-center h-full px-[11px] text-[14px] font-normal text-white/80 hover:text-white transition-colors whitespace-nowrap"
          >
            Features
          </Link>

          {/* Industry ▾ */}
          <NavDropdown label="Industry">
            {INDUSTRY_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="block px-4 py-[9px] text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </NavDropdown>

          {/* Enterprise */}
          <Link
            href="/#enterprise"
            className="flex items-center h-full px-[11px] text-[14px] font-normal text-white/80 hover:text-white transition-colors whitespace-nowrap"
          >
            Enterprise
          </Link>

          {/* Explore Events */}
          <Link
            href="/explore"
            className="flex items-center h-full px-[11px] text-[14px] font-normal text-white/80 hover:text-white transition-colors whitespace-nowrap"
          >
            Explore Events
          </Link>

          {/* Pricing */}
          <Link
            href="/pricing"
            className="flex items-center h-full px-[11px] text-[14px] font-normal text-white/80 hover:text-white transition-colors whitespace-nowrap"
          >
            Pricing
          </Link>

          {/* Help ▾ */}
          <NavDropdown label="Help">
            {HELP_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2.5 px-4 py-[9px] text-[13px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <Icon className="w-[13px] h-[13px] opacity-50" />
                {label}
              </Link>
            ))}
          </NavDropdown>
        </nav>

        {/* ── Desktop Right Cluster ──────────────────────────────────────────── */}
        <div className="hidden lg:flex items-center gap-0 ml-auto flex-shrink-0">

          {/* ── Greetings / User menu ─────────────────────────────────────── */}
          <div ref={signInRef} className="relative h-full flex items-center">
            <button
              onClick={() => { setSignInOpen((o) => !o); setCurrOpen(false); setCountryOpen(false); }}
              className="flex items-center gap-[5px] px-[11px] h-[34px] rounded-[5px] text-[14px] text-white/80 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap"
            >
              {!isLoading && isAuthenticated && user ? (
                <>
                  <div className="w-[18px] h-[18px] rounded-full bg-[#ff5a5f]/25 flex items-center justify-center text-[#ff5a5f] text-[10px] font-bold flex-shrink-0">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] truncate">Hi, {firstName}</span>
                </>
              ) : (
                <span>Greetings! Sign in</span>
              )}
              <ChevronDown className={`w-[13px] h-[13px] opacity-50 transition-transform duration-150 ml-[1px] ${signInOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {signInOpen && (
                <motion.div
                  {...dropAnim}
                  className="absolute right-0 top-full mt-0 w-[210px] rounded-lg bg-[#0e1f3a] border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1 z-[100]"
                >
                  {isAuthenticated && user ? (
                    <>
                      <div className="px-4 py-3 border-b border-white/[0.07]">
                        <p className="text-white text-[13px] font-semibold truncate">{user.name}</p>
                        <p className="text-white/35 text-[11px] truncate mt-0.5">{user.email}</p>
                      </div>
                      <DropLink href="/tickets" onClick={() => setSignInOpen(false)}>
                        <Ticket className="w-[13px] h-[13px] opacity-60" /> My Tickets
                      </DropLink>
                      {(user.role === "organizer" || user.role === "admin") && (
                        <DropLink href="/dashboard" onClick={() => setSignInOpen(false)}>
                          <BarChart2 className="w-[13px] h-[13px] opacity-60" /> Dashboard
                        </DropLink>
                      )}
                      {(user.role === "organizer" || user.role === "staff" || user.role === "admin") && (
                        <DropLink href="/scan" onClick={() => setSignInOpen(false)}>
                          <QrCode className="w-[13px] h-[13px] opacity-60" /> Scan Tickets
                        </DropLink>
                      )}
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setSignInOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-[9px] text-[13px] text-purple-400/75 hover:text-purple-300 hover:bg-purple-500/[0.06] transition-colors"
                        >
                          <ShieldCheck className="w-[13px] h-[13px]" /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-white/[0.07] mt-0.5 pt-0.5">
                        <button
                          onClick={() => { logout(); setSignInOpen(false); toast.success("Signed out"); }}
                          className="w-full flex items-center gap-2.5 px-4 py-[9px] text-[13px] text-red-400/65 hover:text-red-300 hover:bg-red-500/[0.06] transition-colors"
                        >
                          <LogOut className="w-[13px] h-[13px]" /> Sign out
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-2.5 border-b border-white/[0.07]">
                        <p className="text-white/40 text-[11px] leading-relaxed">Sign in to manage your events and tickets</p>
                      </div>
                      <DropLink href="/login" onClick={() => setSignInOpen(false)}>
                        <User className="w-[13px] h-[13px] opacity-60" /> Sign In
                      </DropLink>
                      <DropLink href="/signup" onClick={() => setSignInOpen(false)}>
                        <Ticket className="w-[13px] h-[13px] opacity-60" /> Create Account
                      </DropLink>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-[18px] bg-white/[0.12] mx-2 flex-shrink-0" />

          {/* ── Currency ──────────────────────────────────────────────────── */}
          <div ref={currRef} className="relative h-full flex items-center">
            <button
              onClick={() => { setCurrOpen((o) => !o); setSignInOpen(false); setCountryOpen(false); }}
              className="flex items-center gap-[4px] px-[9px] h-[34px] rounded-[5px] text-[13px] text-white/65 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap font-mono"
            >
              <span className="text-[12px]">{currency.symbol}</span>
              <span className="text-[12px] tracking-wide">{currency.code}</span>
              <ChevronDown className={`w-[12px] h-[12px] opacity-40 ml-[1px] transition-transform duration-150 ${currOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {currOpen && (
                <motion.div
                  {...dropAnim}
                  className="absolute right-0 top-full mt-0 w-[220px] rounded-lg bg-[#0e1f3a] border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.5)] py-1 z-[100]"
                >
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">Currency</p>
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => selectCurrency(c)}
                      className={`w-full flex items-center gap-3 px-4 py-[9px] text-[13px] hover:bg-white/[0.06] transition-colors text-left ${
                        currency.code === c.code ? "text-[#ff5a5f]" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <span className="text-[15px] leading-none">{c.flag}</span>
                      <span className="flex-1">{c.label}</span>
                      <span className="font-mono text-[11px] opacity-60">{c.symbol}</span>
                      {currency.code === c.code && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] flex-shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="w-px h-[18px] bg-white/[0.12] mx-2 flex-shrink-0" />

          {/* ── Create Event ──────────────────────────────────────────────── */}
          <Link
            href={isAuthenticated && isOrganizer ? "/create-event" : "/create-event"}
            className="flex items-center gap-[5px] px-[14px] h-[34px] rounded-[5px] text-white text-[14px] font-semibold whitespace-nowrap transition-all duration-150"
            style={{
              background: "#00d26a",
              boxShadow: "0 0 16px rgba(0,210,106,0.28)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#00be60"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#00d26a"; }}
          >
            <Calendar className="w-[14px] h-[14px]" />
            <Plus className="w-[11px] h-[11px] -ml-[3px]" />
            {isAuthenticated && isOrganizer ? "Create Event" : isAuthenticated && isAttendee ? "Become Organizer" : "Create Event"}
          </Link>

          {/* Divider */}
          <div className="w-px h-[18px] bg-white/[0.12] mx-2 flex-shrink-0" />

          {/* ── Country selector ──────────────────────────────────────────── */}
          <div ref={countryRef} className="relative h-full flex items-center">
            <button
              onClick={() => { setCountryOpen((o) => !o); setCountrySearch(""); setSignInOpen(false); setCurrOpen(false); }}
              className="flex items-center gap-[5px] px-[9px] h-[34px] rounded-[5px] text-[14px] text-white/75 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap"
            >
              <span className="text-[16px] leading-none">{selectedCountry.flag}</span>
              <span className="text-[14px]">{selectedCountry.name}</span>
              <ChevronDown className={`w-[13px] h-[13px] opacity-50 ml-[1px] transition-transform duration-150 ${countryOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {countryOpen && (
                <motion.div
                  {...dropAnim}
                  className="absolute right-0 top-full mt-0 w-[250px] rounded-lg bg-[#0e1f3a] border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[100] flex flex-col"
                  style={{ maxHeight: "400px" }}
                >
                  {/* Search */}
                  <div className="p-2 border-b border-white/[0.07] flex-shrink-0">
                    <div className="flex items-center gap-2 px-3 py-[7px] rounded-md bg-white/[0.05] border border-white/[0.08]">
                      <Search className="w-[13px] h-[13px] text-white/30 flex-shrink-0" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search country…"
                        className="flex-1 bg-transparent text-[12px] text-white placeholder-white/25 focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="overflow-y-auto flex-1 py-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,90,95,0.2) transparent" }}>
                    {countrySearch.trim() ? (
                      filteredCountries.length > 0 ? (
                        filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(""); toast.success(`Region: ${c.name}`); }}
                            className={`w-full flex items-center gap-3 px-4 py-[9px] text-[13px] hover:bg-white/[0.06] transition-colors text-left ${
                              selectedCountry.code === c.code ? "text-[#ff5a5f]" : "text-white/65 hover:text-white"
                            }`}
                          >
                            <span className="text-[15px] leading-none w-5 text-center">{c.flag}</span>
                            <span className="flex-1">{c.name}</span>
                            {selectedCountry.code === c.code && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f]" />}
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-6 text-white/30 text-[12px] text-center">No countries found</p>
                      )
                    ) : (
                      Object.entries(grouped).map(([region, countries]) => (
                        <div key={region}>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">{region}</p>
                          {countries.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(""); toast.success(`Region set to ${c.name}`); }}
                              className={`w-full flex items-center gap-3 px-4 py-[8px] text-[13px] hover:bg-white/[0.06] transition-colors text-left ${
                                selectedCountry.code === c.code ? "text-[#ff5a5f]" : "text-white/60 hover:text-white"
                              }`}
                            >
                              <span className="text-[15px] leading-none w-5 text-center">{c.flag}</span>
                              <span className="flex-1">{c.name}</span>
                              {selectedCountry.code === c.code && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a5f] flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Mobile: hamburger + create ──────────────────────────────────────── */}
        <div className="lg:hidden ml-auto flex items-center gap-2">
          <Link
            href="/create-event"
            className="flex items-center gap-1 px-3 h-[30px] rounded-[5px] bg-[#00d26a] text-white text-[12px] font-semibold"
          >
            <Plus className="w-[13px] h-[13px]" />
            Create
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-[7px] rounded-md text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-white/[0.07]"
            style={{ background: "#152437" }}
          >
            <div className="px-4 py-3 flex flex-col gap-px">
              {[
                { href: "/#features", label: "Features"      },
                { href: "/explore",   label: "Explore Events" },
                { href: "/#enterprise", label: "Enterprise"     },
                { href: "/#pricing",    label: "Pricing"        },
              ].map(({ href, label }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-[10px] text-[14px] text-white/75 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="my-2 border-t border-white/[0.07]" />
              {isAuthenticated && user ? (
                <>
                  <Link href="/tickets"   onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-[10px] text-[14px] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"><Ticket   className="w-4 h-4 opacity-60" /> My Tickets</Link>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-[10px] text-[14px] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"><BarChart2 className="w-4 h-4 opacity-60" /> Dashboard</Link>
                  <button onClick={() => { logout(); setMobileOpen(false); toast.success("Signed out"); }} className="w-full flex items-center gap-2.5 px-3 py-[10px] text-[14px] text-red-400/70 hover:text-red-300 hover:bg-red-500/[0.05] rounded-md transition-colors"><LogOut className="w-4 h-4" /> Sign out</button>
                </>
              ) : (
                <>
                  <Link href="/login"  onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-[10px] text-[14px] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"><User   className="w-4 h-4 opacity-60" /> Sign In</Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-[10px] text-[14px] text-white/70 hover:text-white hover:bg-white/[0.05] rounded-md transition-colors"><Ticket className="w-4 h-4 opacity-60" /> Create Account</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>

    {/* Dynamic Global Verification Banner */}
    {!isLoading && isAuthenticated && user && !user.isVerified && (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-white relative z-40 flex items-center justify-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
        <span>Please verify your email address. We sent a verification link to <strong className="text-amber-300 font-semibold">{user.email}</strong>.</span>
        <button
          onClick={async () => {
            if (!accessToken) return;
            setResending(true);
            const res = await authApi.resendVerification(accessToken);
            setResending(false);
            if (res.success) {
              toast.success("Verification link sent! Check your inbox.");
            } else {
              toast.error(extractError(res));
            }
          }}
          disabled={resending}
          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold ml-1 transition-all disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend Link"}
        </button>
      </div>
    )}
    </>
  );
}
