"use client";

import { useState } from "react";
import { 
  Search, Mail, Phone, Clock, FileText, ArrowRight, 
  HelpCircle, MessageSquare, AlertCircle, Sparkles, CheckCircle2 
} from "lucide-react";
import { supportApi, extractError, extractFieldErrors } from "@/lib/api";
import toast from "react-hot-toast";

const FAQ_DATABASE = [
  {
    category: "ticket",
    q: "How do I purchase tickets for an event?",
    a: "Find the event page, click the 'Book Tickets' button, select the desired ticket tiers and quantities, enter your attendee information, and proceed to complete checkout via our secure Stripe integration. You will receive tickets with QR codes in your inbox instantly."
  },
  {
    category: "ticket",
    q: "Where do I access my purchased tickets?",
    a: "Your tickets are sent immediately via email. You can also sign in to your EventNest account and navigate to the 'My Tickets' page in the top right greeting menu, where all valid, used, and refunded tickets are saved with scan-ready QR codes."
  },
  {
    category: "refund",
    q: "How can I request a ticket refund?",
    a: "Log in to your account, open 'My Tickets', choose the specific booking, and select 'Request Refund'. Note that refunds are governed by the organizer's specific event policy (e.g. 7-Day or No Refunds). If the organizer cancels the event, refunds are processed automatically."
  },
  {
    category: "organizer",
    q: "How do I setup organizer payouts?",
    a: "Navigate to your Dashboard, click 'Settings' or 'Payouts', and link your Stripe account. If you do not have a Stripe account, the wizard will guide you through creating one in less than two minutes. Once linked, ticket revenues flow directly to your balance."
  },
  {
    category: "organizer",
    q: "How do we scan and verify ticket QR codes at the gate?",
    a: "We provide a built-in mobile scanning app. Log into your organizer account on any smartphone, navigate to the 'Scan Tickets' scanner route from the nav dropdown, grant camera permission, and scan the guest QR codes. Scans sync in real-time."
  },
  {
    category: "account",
    q: "How can I reset my account password?",
    a: "Go to the Sign In page, click 'Forgot Password', enter your account email address, and click request reset. We will email you a secure, time-sensitive verification link (valid for 1 hour) to enter a new password."
  },
  {
    category: "payment",
    q: "Is payment processing safe on EventNest?",
    a: "Absolutely. All transactions are routed directly through Stripe, a leading PCI-DSS Level 1 compliant payment processor. EventNest never stores or logs your raw credit card numbers or security codes on our backend servers."
  },
  {
    category: "general",
    q: "Can I host virtual/online webinars on EventNest?",
    a: "Yes! When creating an event, toggle the 'Online Event' switch. You can add the stream link (Zoom, YouTube Live, Twitch, etc.) which is encrypted and only displayed to attendees with valid tickets on their order details page."
  }
];

const TOPICS = [
  { id: "all", name: "All Help Topics" },
  { id: "ticket", name: "Ticket Purchases" },
  { id: "refund", name: "Refunds & Cancellations" },
  { id: "organizer", name: "Organizer Settings" },
  { id: "payment", name: "Stripe & Security" },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("all");

  // Support ticket form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter FAQs
  const filteredFaqs = FAQ_DATABASE.filter(faq => {
    const matchesSearch = faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = activeTopic === "all" || faq.category === activeTopic;
    return matchesSearch && matchesTopic;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await supportApi.submitTicket({ name, email, subject, message });
      if (res.success) {
        toast.success("Support ticket submitted! We will contact you soon.");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        const fieldErrs = extractFieldErrors(res);
        if (Object.keys(fieldErrs).length > 0) {
          setErrors(fieldErrs);
          toast.error("Please fill all required fields correctly.");
        } else {
          toast.error(extractError(res));
        }
      }
    } catch (err: any) {
      toast.error("Failed to connect to the support server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff5a5f]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[60%] h-[60%] bg-[#00d26a]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        
        {/* Page Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-[#ff5a5f] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            24/7 Help Desk
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            How can we support you?
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Search our knowledge base for instant answers or send an official support ticket directly to our customer success team.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <div className="p-6 rounded-2xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#00d26a]/15 text-[#00d26a]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Average Response Time</h3>
              <p className="text-sm text-white/50 mt-1">Under 2 hours for Pro plans</p>
            </div>
          </div>
          
          <div className="p-6 rounded-2xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-[#ff5a5f]/15 text-[#ff5a5f]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Direct Email Support</h3>
              <p className="text-sm text-white/50 mt-1">support@eventnest.dev</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 text-white/80">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Emergency Hotline</h3>
              <p className="text-sm text-white/50 mt-1">Available for Enterprise tier</p>
            </div>
          </div>
        </div>

        {/* Dynamic FAQ Search Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-28">
          
          {/* FAQ Column (Left/Middle) */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-6">
              Frequently Asked Questions
            </h2>

            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                id="faq-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords (e.g., refund, scan, ticket)..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#112240]/60 border border-white/[0.08] text-white placeholder-white/35 text-sm focus:outline-none focus:border-[#ff5a5f]/50 focus:bg-[#112240]/90 transition-all shadow-inner"
              />
            </div>

            {/* Topic Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id)}
                  className={`py-2 px-4 rounded-full text-xs font-bold transition-all ${
                    activeTopic === topic.id 
                      ? "bg-[#ff5a5f] text-[#0a1628]" 
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {topic.name}
                </button>
              ))}
            </div>

            {/* FAQs List */}
            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => (
                  <div 
                    key={idx}
                    className="p-6 rounded-xl border border-white/[0.08] bg-[#112240]/20 hover:bg-[#112240]/30 transition-all"
                  >
                    <h3 className="text-base font-bold text-white flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-[#00d26a] flex-shrink-0 mt-0.5" />
                      <span>{faq.q}</span>
                    </h3>
                    <p className="text-sm text-white/60 mt-3 leading-relaxed pl-8">
                      {faq.a}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <AlertCircle className="w-8 h-8 text-white/30 mx-auto mb-3" />
                  <p className="text-sm text-white/40 font-semibold">No matching topics found.</p>
                  <p className="text-xs text-white/20 mt-1">Try searching another phrase or send a message below.</p>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Form (Right) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#112240]/40 backdrop-blur-xl p-8 shadow-xl">
            <h2 className="text-xl font-extrabold text-white tracking-tight mb-2">
              Submit a Ticket
            </h2>
            <p className="text-white/50 text-xs leading-relaxed mb-6">
              Fill out this form and our support desk will contact you. We reply directly via email.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Full Name</label>
                <input
                  id="ticket-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all ${
                    errors.name ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.name && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Email Address</label>
                <input
                  id="ticket-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all ${
                    errors.email ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.email && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.email}</p>}
              </div>

              {/* Subject */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Subject Topic</label>
                <input
                  id="ticket-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Refund request for Event X"
                  className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all ${
                    errors.subject ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.subject && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.subject}</p>}
              </div>

              {/* Message */}
              <div>
                <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Detailed Message</label>
                <textarea
                  id="ticket-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue with order numbers or ticket details..."
                  className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all resize-none ${
                    errors.message ? "border-red-500/50" : "border-white/10"
                  }`}
                />
                {errors.message && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.message}</p>}
              </div>

              {/* Submit Button */}
              <button
                id="ticket-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-lg bg-[#ff5a5f] text-[#0a1628] font-bold text-sm hover:bg-[#ff5a5f]/90 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
                    Sending Ticket...
                  </>
                ) : (
                  <>
                    Submit Ticket
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
