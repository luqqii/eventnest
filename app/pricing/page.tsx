"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calculator, Check, ArrowRight, HelpCircle, ChevronDown, 
  Sparkles, ShieldCheck, Zap, DollarSign, Users, Award 
} from "lucide-react";
import toast from "react-hot-toast";

// SEO / Meta data helper for Next.js app router client components is just document title / head tags or static metadata
// In Next.js client components we can use a simple header/metadata structure, and define page contents.

const PLANS = [
  {
    name: "Basic",
    icon: Users,
    desc: "Perfect for grassroots meetups, local clubs, and small indie events.",
    price: "Free",
    subprice: "No monthly subscription",
    feeRate: 0.025, // 2.5%
    feeFixed: 0.30, // $0.30
    features: [
      "Create unlimited events",
      "Standard ticketing (General & VIP)",
      "Free ticket scanner app",
      "Stripe payment gateway integration",
      "Attendee list export (CSV)",
      "Email support (24-48h response)",
    ],
    cta: "Start for Free",
    href: "/signup",
    popular: false,
  },
  {
    name: "Professional",
    icon: Zap,
    desc: "Ideal for professional organizers, festivals, and growing businesses.",
    price: "1.9% + $0.25",
    subprice: "per ticket sold. No setup fees",
    feeRate: 0.019, // 1.9%
    feeFixed: 0.25, // $0.25
    features: [
      "Everything in Basic",
      "Discounted ticket fee rate",
      "Custom registration form fields",
      "Promo codes & discount limits",
      "Advanced sales dashboard & analytics",
      "Priority email support (under 3h)",
      "Remove EventNest branding from emails",
      "Embeddable checkout widget",
    ],
    cta: "Get Professional",
    href: "/signup",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Award,
    desc: "For venues, stadiums, and high-volume event creators.",
    price: "Custom",
    subprice: "Tailored volume discounts",
    feeRate: 0.012, // 1.2% (estimated for calculator default)
    feeFixed: 0.20, // $0.20 (estimated for calculator default)
    features: [
      "Everything in Pro",
      "Custom negotiated ticketing fees",
      "Dedicated account manager",
      "Full API access & webhook events",
      "Custom domain support (white-labeled)",
      "99.9% uptime SLA guarantee",
      "Phone & 24/7 emergency support",
      "On-site check-in coordination support",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
  },
];

const FAQS = [
  {
    q: "How do ticket fees work on EventNest?",
    a: "We only charge a small percentage fee per paid ticket sold (e.g. 2.5% + $0.30 on Basic). Free tickets are 100% free — we never charge a fee for free registrations. There are no setup fees, no monthly subscriptions, and no hidden contracts."
  },
  {
    q: "Can I pass the ticketing fees onto my attendees?",
    a: "Yes! You can choose to pass the fees to the buyers (the fee is added on top of your ticket price) or absorb the fees (you pay the fee out of your ticket face value). Passing fees is the default and means EventNest costs you nothing."
  },
  {
    q: "When and how do I receive my payouts?",
    a: "EventNest integrates directly with Stripe. When an attendee buys a ticket, the money goes straight to your connected Stripe account and is deposited to your bank account based on your Stripe payout schedule (usually 2-7 days, depending on location)."
  },
  {
    q: "Are there any setup costs or card processing fees?",
    a: "Stripe standard card processing fees (typically 2.9% + $0.30 per transaction) apply separately to process credit card payments. There are absolutely no setup costs, annual fees, or monthly subscription retainers on EventNest."
  },
  {
    q: "Do you support currency conversions or international sales?",
    a: "Yes, we support ticketing in over 16 global currencies (USD, AUD, GBP, EUR, CAD, etc.). Attendees see prices and check out in the currency you configure for your event, avoiding surprises."
  },
  {
    q: "What is your refund policy for cancelled events?",
    a: "If you cancel your event, we automatically process full refunds to all ticket buyers. EventNest fees are generally non-refundable to cover processing costs, but we work with Enterprise clients on customized options."
  }
];

export default function PricingPage() {
  // Calculator state
  const [ticketPrice, setTicketPrice] = useState(50);
  const [ticketsCount, setTicketsCount] = useState(1000);
  const [passFees, setPassFees] = useState(true); // default pass fees to buyer
  const [selectedPlan, setSelectedPlan] = useState("Professional");

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Get active plan for calculations
  const activePlan = PLANS.find(p => p.name === selectedPlan) || PLANS[1];

  // Calculations
  const feePerTicket = ticketPrice * activePlan.feeRate + activePlan.feeFixed;
  const buyerPrice = passFees ? ticketPrice + feePerTicket : ticketPrice;
  const organizerRevenuePerTicket = passFees ? ticketPrice : ticketPrice - feePerTicket;
  
  const totalGross = ticketPrice * ticketsCount;
  const totalFees = feePerTicket * ticketsCount;
  const totalRevenue = organizerRevenuePerTicket * ticketsCount;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff5a5f]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-[#00d26a]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-[#ff5a5f] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Fair & Transparent Ticketing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6">
            Simple, honest pricing. <br />
            <span className="text-[#00d26a]">No surprise fees.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Free events are always 100% free. Paid events only pay when you make a sale. 
            Choose to absorb fees or pass them on to your attendees.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 items-stretch">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div 
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-8 backdrop-blur-md transition-all duration-300 ${
                  plan.popular 
                    ? "bg-[#112240] border-2 border-[#ff5a5f] shadow-[0_8px_32px_rgba(255,90,95,0.15)] scale-100 lg:scale-[1.03]" 
                    : "bg-[#112240]/60 border border-white/[0.08] hover:border-white/15 hover:bg-[#112240]/80"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full bg-[#ff5a5f] text-[#0a1628] font-bold text-xs uppercase tracking-widest flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-xl ${
                    plan.popular ? "bg-[#ff5a5f]/10 text-[#ff5a5f]" : "bg-white/5 text-white/80"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-0.5">Plan tier</p>
                  </div>
                </div>

                <p className="text-white/60 text-sm leading-relaxed mb-8 min-h-[48px]">
                  {plan.desc}
                </p>

                <div className="mb-8 border-b border-white/5 pb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white">{plan.price}</span>
                  </div>
                  <p className="text-white/45 text-xs mt-2 font-medium">{plan.subprice}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-[#ff5a5f]" : "text-[#00d26a]"}`} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  id={`cta-btn-${plan.name.toLowerCase()}`}
                  href={plan.href}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all ${
                    plan.popular 
                      ? "bg-[#ff5a5f] text-[#0a1628] hover:bg-[#ff5a5f]/90 hover:shadow-lg hover:shadow-[#ff5a5f]/20" 
                      : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* FEE CALCULATOR HUD */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#112240]/40 backdrop-blur-xl p-8 sm:p-12 mb-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00d26a]/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row gap-12 relative z-10">
            {/* Left side: Inputs */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-[#00d26a]/15 text-[#00d26a]">
                  <Calculator className="w-5 h-5" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Estimate Your Revenue
                </h2>
              </div>
              
              <p className="text-white/50 text-sm mb-8 max-w-xl">
                Slide the parameters to instantly compute payout margins, customer ticket pricing adjustments, and transparent EventNest service charges.
              </p>

              {/* Tier selector */}
              <div className="mb-8">
                <label className="text-xs uppercase tracking-wider font-semibold text-white/40 block mb-3">Select Pricing Tier</label>
                <div className="grid grid-cols-3 gap-3 p-1 rounded-xl bg-white/5 border border-white/5">
                  {PLANS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedPlan(p.name)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                        selectedPlan === p.name 
                          ? "bg-[#ff5a5f] text-[#0a1628] shadow-md" 
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 1: Ticket Price */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-white/80">Average Ticket Price</span>
                  <span className="font-mono text-xl font-extrabold text-[#00d26a]">${ticketPrice}</span>
                </div>
                <input
                  id="calc-ticket-price"
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-white/10 accent-[#00d26a] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/30 font-semibold mt-1.5 font-mono">
                  <span>$5</span>
                  <span>$150</span>
                  <span>$300</span>
                </div>
              </div>

              {/* Slider 2: Volume */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-white/80">Tickets Sold Per Month</span>
                  <span className="font-mono text-xl font-extrabold text-[#00d26a]">{ticketsCount.toLocaleString()}</span>
                </div>
                <input
                  id="calc-ticket-count"
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={ticketsCount}
                  onChange={(e) => setTicketsCount(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-white/10 accent-[#00d26a] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-white/30 font-semibold mt-1.5 font-mono">
                  <span>50</span>
                  <span>5,000</span>
                  <span>10,000+</span>
                </div>
              </div>

              {/* Toggle switch: Pass fees */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <span className="text-sm font-bold text-white block">Pass service fees to buyer</span>
                  <span className="text-xs text-white/40 mt-0.5 block">Attendee pays the ticketing fee on top of ticket price.</span>
                </div>
                <button
                  id="calc-toggle-fees"
                  onClick={() => setPassFees(!passFees)}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${
                    passFees ? "bg-[#00d26a]" : "bg-white/15"
                  } relative flex items-center`}
                >
                  <div className={`w-6 h-6 rounded-full bg-[#0a1628] shadow transition-all ${
                    passFees ? "translate-x-6" : "translate-x-0"
                  }`} />
                </button>
              </div>
            </div>

            {/* Right side: Results HUD */}
            <div className="lg:w-96 rounded-xl border border-white/[0.08] bg-[#0d1f2d]/80 p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/30 mb-6 font-mono">Calculation Summary</h3>
                
                <div className="space-y-5 border-b border-white/5 pb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60 font-medium">Ticket Face Value</span>
                    <span className="font-mono text-white font-bold">${ticketPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/60 font-medium">EventNest Service Fee</span>
                    <span className="font-mono text-[#ff5a5f] font-bold">+${feePerTicket.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                    <span className="text-white/80 font-bold">Buyer Ticket Price</span>
                    <span className="font-mono text-xl text-white font-extrabold">${buyerPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="py-6 space-y-4">
                  <div className="flex justify-between text-xs text-white/45">
                    <span>Monthly Gross Ticket Volume</span>
                    <span className="font-mono">${totalGross.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#ff5a5f]/80">
                    <span>Total Ticket Fees Collected</span>
                    <span className="font-mono">-${totalFees.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5">
                <span className="text-xs uppercase tracking-wider text-white/30 block mb-1 font-mono">Organizer Take-home Net Revenue</span>
                <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#00d26a] block">${totalRevenue.toLocaleString()}</span>
                
                <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
                  *Excludes standard credit card merchant processor fees (e.g. Stripe card processing rates).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-white/50 text-sm">
              Have questions about billing, plans, or payouts? Find quick replies here.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="rounded-xl border border-white/[0.08] bg-[#112240]/30 overflow-hidden transition-all"
                >
                  <button
                    id={`faq-btn-${index}`}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full py-5 px-6 flex items-center justify-between gap-4 text-left transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-sm sm:text-base font-bold text-white pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/40 transition-transform flex-shrink-0 ${
                      isOpen ? "rotate-180 text-[#ff5a5f]" : ""
                    }`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-5 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA section */}
        <div className="rounded-2xl border border-[#ff5a5f]/20 bg-gradient-to-r from-[#ff5a5f]/5 to-transparent p-8 sm:p-12 text-center max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-[#ff5a5f]/5 opacity-30 blur-[40px] pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            Ready to sell tickets to your next event?
          </h2>
          <p className="text-white/60 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Create an organizer account in less than two minutes. Setup ticket tiers and publish your page instantly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              id="cta-bottom-signup"
              href="/signup"
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#ff5a5f] text-[#0a1628] font-bold text-sm hover:bg-[#ff5a5f]/90 transition-all flex items-center justify-center gap-2"
            >
              Sign Up Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              id="cta-bottom-contact"
              href="/contact"
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
