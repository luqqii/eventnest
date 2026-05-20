"use client";

import { useState } from "react";
import { 
  MapPin, Mail, Phone, ArrowRight, ShieldCheck, 
  Map, Compass, Plus, Minus, Send, Sparkles, CheckCircle2 
} from "lucide-react";
import { supportApi, extractError, extractFieldErrors } from "@/lib/api";
import toast from "react-hot-toast";

export default function ContactPage() {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Interactive HUD Map state
  const [zoom, setZoom] = useState(1.5);
  const [coordOffset, setCoordOffset] = useState({ x: 0, y: 0 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const res = await supportApi.submitTicket({ name, email, subject, message });
      if (res.success) {
        toast.success("Message dispatched! Our team will contact you shortly.");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      } else {
        const fieldErrs = extractFieldErrors(res);
        if (Object.keys(fieldErrs).length > 0) {
          setErrors(fieldErrs);
          toast.error("Please fill all required inputs correctly.");
        } else {
          toast.error(extractError(res));
        }
      }
    } catch (err: any) {
      toast.error("Failed to connect to the contact server.");
    } finally {
      setLoading(false);
    }
  }

  function handleZoomIn() {
    if (zoom < 3) setZoom(prev => prev + 0.25);
  }

  function handleZoomOut() {
    if (zoom > 0.75) setZoom(prev => prev - 0.25);
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff5a5f]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-[#00d26a]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold tracking-wider text-[#ff5a5f] uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Get In Touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Connect with EventNest
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Have questions about planning a large event or partnering with us? Send us a direct message, and we'll reply right away.
          </p>
        </div>

        {/* Content Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch mb-20">
          
          {/* Contact Details & Futuristic HUD Map (Left) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            
            {/* Quick coordinates cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md">
                <MapPin className="w-5 h-5 text-[#ff5a5f] mb-3" />
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Office Location</h4>
                <p className="text-xs text-white/50 mt-2">548 Market St, San Francisco, CA 94104</p>
              </div>

              <div className="p-6 rounded-xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md">
                <Mail className="w-5 h-5 text-[#00d26a] mb-3" />
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Email Inquiry</h4>
                <p className="text-xs text-white/50 mt-2">info@eventnest.dev</p>
              </div>

              <div className="p-6 rounded-xl bg-[#112240]/40 border border-white/[0.08] backdrop-blur-md">
                <Compass className="w-5 h-5 text-white/70 mb-3" />
                <h4 className="font-bold text-sm text-white uppercase tracking-wider">Working Hours</h4>
                <p className="text-xs text-white/50 mt-2">Mon - Fri: 9:00 AM to 6:00 PM PST</p>
              </div>
            </div>

            {/* VIRTUAL HUD MAP MOCKUP */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0d1f2d]/60 flex-1 min-h-[350px] overflow-hidden flex flex-col justify-between p-6 group">
              {/* HUD grid mesh background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

              {/* HUD header */}
              <div className="flex items-center justify-between z-10 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#ff5a5f] animate-ping" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#ff5a5f] font-bold">RADAR LINK ACTIVE</span>
                </div>
                <div className="text-[10px] font-mono text-white/30">
                  REF: SF_GRID_37.7749N
                </div>
              </div>

              {/* Central stylized radar canvas */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Expanding sonar ring 1 */}
                <div className="w-40 h-40 border border-dashed border-[#00d26a]/15 rounded-full animate-[ping_6s_infinite_linear]" />
                {/* Expanding sonar ring 2 */}
                <div className="w-72 h-72 border border-dashed border-[#00d26a]/5 rounded-full animate-[ping_8s_infinite_linear] delay-1000" />
                
                {/* HUD Crosshairs */}
                <div className="w-px h-64 bg-white/5 absolute" />
                <div className="h-px w-64 bg-white/5 absolute" />
                
                {/* Pulsing Coordinates Marker */}
                <div 
                  className="absolute p-3 rounded-full bg-[#ff5a5f]/10 border border-[#ff5a5f]/30 flex flex-col items-center justify-center transition-all duration-300"
                  style={{ transform: `scale(${zoom})` }}
                >
                  <MapPin className="w-5 h-5 text-[#ff5a5f] drop-shadow-[0_0_8px_#ff5a5f]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5a5f] absolute animate-ping opacity-60" />
                </div>
              </div>

              {/* HUD dials / UI overlay */}
              <div className="z-10 flex justify-between items-end">
                {/* Bottom Left: Coordinates HUD readout */}
                <div className="bg-[#0a1628]/90 border border-white/10 rounded-lg p-3 font-mono text-[10px] space-y-1 select-none backdrop-blur-md">
                  <p className="text-white/40 uppercase tracking-widest font-bold">SF headquarters</p>
                  <p className="text-[#00d26a] font-bold">LAT: 37.7749° N</p>
                  <p className="text-[#00d26a] font-bold">LON: 122.4194° W</p>
                  <p className="text-white/20">ZOOM LEVEL: {zoom.toFixed(2)}X</p>
                </div>

                {/* Bottom Right: Zoom knobs */}
                <div className="flex flex-col gap-1.5 z-10">
                  <button 
                    id="hud-zoom-in"
                    onClick={handleZoomIn}
                    className="p-2 rounded-lg bg-[#112240]/80 border border-white/10 text-white/70 hover:text-white hover:bg-[#112240] transition-all"
                    title="Zoom Radar In"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button 
                    id="hud-zoom-out"
                    onClick={handleZoomOut}
                    className="p-2 rounded-lg bg-[#112240]/80 border border-white/10 text-white/70 hover:text-white hover:bg-[#112240] transition-all"
                    title="Zoom Radar Out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Contact Message Submission Form (Right) */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#112240]/40 backdrop-blur-xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
                Send a Message
              </h2>
              <p className="text-white/50 text-xs leading-relaxed mb-6">
                Fill in the details below, and a representative will connect with you via email. All fields are required.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Full Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Miller"
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
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@domain.com"
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
                    id="contact-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Enterprise volume pricing inquiry"
                    className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all ${
                      errors.subject ? "border-red-500/50" : "border-white/10"
                    }`}
                  />
                  {errors.subject && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.subject}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="text-[11px] uppercase tracking-wider font-semibold text-white/40 block mb-1.5">Your Message</label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type details about your event, expected attendance volume, or requirements..."
                    className={`w-full px-4 py-3 rounded-lg bg-[#0d1f2d] border text-white text-sm focus:outline-none focus:border-[#ff5a5f]/50 transition-all resize-none ${
                      errors.message ? "border-red-500/50" : "border-white/10"
                    }`}
                  />
                  {errors.message && <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.message}</p>}
                </div>

                {/* Submit Button */}
                <button
                  id="contact-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-lg bg-[#00d26a] text-[#0a1628] font-bold text-sm hover:bg-[#00be60] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0a1628] border-t-transparent rounded-full animate-spin" />
                      Sending Message...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
            
            <div className="border-t border-white/5 mt-8 pt-4 flex items-center gap-2 text-[10px] text-white/35 font-mono select-none">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00d26a]" />
              <span>TLS ENCRYPTED CONNECTION SECURED</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
