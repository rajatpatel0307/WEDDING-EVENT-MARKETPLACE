import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ArrowUpRight, Flower2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { cities } from "../layout/navigation";

// Video asset path
import heroVideo from "../../assets/gemini_generated_video_95816cb3.mp4";

export default function Hero() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);
  const navigate = useNavigate();

  function search(e) {
    e.preventDefault();
    navigate(`/search?${new URLSearchParams({ q: query.trim(), city })}`);
  }

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className="relative w-full min-h-[95dvh] lg:min-h-[100dvh] flex flex-col justify-between overflow-hidden bg-[#faf8f5] text-stone-900 pt-20 sm:pt-24 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-8">
      {/* Background Video with Soft Blend */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none scale-105 opacity-65 md:opacity-75 contrast-[1.05] brightness-90 filter"
      >
        <source src={heroVideo} type="video/mp4" />
      </video>

      {/* Luxury Royal Overlays - Blends Dark Video into Light Web Layout */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#faf8f5]/5 via-black/3 to-[#faf8f5] pointer-events-none" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-transparent to-[#faf8f5]/90 pointer-events-none" />

      {/* Floating Sound Toggle */}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
        className="absolute top-5 right-5 sm:top-8 sm:right-8 z-30 p-2.5 sm:p-3 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border border-amber-900/15 text-stone-800 hover:text-amber-700 shadow-md transition-all active:scale-95"
      >
        {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      </button>

      {/* Hero Central Content */}
      <div className="relative z-10 max-w-4xl mx-auto w-full my-auto text-center flex flex-col items-center pt-8 sm:pt-0">
        {/* Kicker Ribbon */}
        <div className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-amber-200/90 text-amber-900 text-[11px] sm:text-xs tracking-[0.22em] font-semibold uppercase mb-5 sm:mb-8 shadow-sm">
          <Flower2 size={14} className="text-amber-600 animate-spin-slow shrink-0" />
          <span>For Your Beautifully Ever After</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-[1.15] text-stone-900 drop-shadow-sm">
          Plan your dream <br className="hidden sm:inline" />
          <span className="font-light italic bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 bg-clip-text text-transparent">
            wedding.
          </span>{" "}
          <em className="font-serif italic font-light text-stone-800 block sm:inline">
            All in one place.
          </em>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 sm:mt-6 max-w-xl sm:max-w-2xl text-sm sm:text-base md:text-lg text-stone-700 font-normal leading-relaxed px-2">
          Discover venues, fine caterers, floral decorators, and bespoke wedding
          cinematographers for a celebration that echoes your timeless story.
        </p>

        {/* CTAs */}
        <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4">
          <Link
            to="/vendors"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-amber-50 font-medium text-sm tracking-wide shadow-lg shadow-amber-900/15 transition-all hover:scale-[1.02] active:scale-95"
          >
            Explore vendors <ArrowUpRight size={16} />
          </Link>
          <Link
            to="/venues"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white/85 hover:bg-white backdrop-blur-sm border border-stone-300 text-stone-800 font-medium text-sm tracking-wide shadow-sm transition-all active:scale-95"
          >
            Find a venue <ArrowUpRight size={16} />
          </Link>
        </div>

        {/* Micro Tagline */}
        <span className="mt-6 hidden sm:block text-[11px] sm:text-xs tracking-[0.25em] uppercase text-stone-600 font-medium">
          Your people • Your place • Your perfect beginning
        </span>
      </div>

      {/* Responsive Glassmorphic Search Form */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-8 sm:mt-10">
        <form
          role="search"
          onSubmit={search}
          className="p-2 sm:p-2.5 rounded-2xl sm:rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-xl shadow-stone-300/40 grid grid-cols-1 md:grid-cols-12 gap-2"
        >
          {/* Wishlist / Service Input */}
          <label className="md:col-span-5 flex items-center gap-3 px-4 py-2.5 rounded-xl sm:rounded-full bg-stone-50/90 border border-stone-200/80 focus-within:border-amber-700 focus-within:bg-white transition-all cursor-text">
            <Search size={18} className="text-amber-700 shrink-0" />
            <div className="flex flex-col text-left w-full overflow-hidden">
              <span className="text-[10px] tracking-wider uppercase text-stone-500 font-bold">
                Your Wedding Wish List
              </span>
              <input
                type="search"
                list="wedding-search-suggestions"
                placeholder="What are you looking for?"
                aria-label="Search service, vendor or venue"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
                className="bg-transparent text-sm text-stone-900 placeholder-stone-400 focus:outline-none w-full font-medium"
              />
            </div>
          </label>

          {/* Datalist for Quick Selection */}
          <datalist id="wedding-search-suggestions">
            {[
              "Venue",
              "Catering",
              "Decoration",
              "Photography",
              "DJ",
              "Makeup",
              "Mehndi",
              "Wedding Clothing",
              "Jewellery",
              "Transportation",
            ].map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>

          {/* Location Selector */}
          <label className="md:col-span-4 flex items-center gap-3 px-4 py-2.5 rounded-xl sm:rounded-full bg-stone-50/90 border border-stone-200/80 focus-within:border-amber-700 focus-within:bg-white transition-all cursor-pointer">
            <MapPin size={18} className="text-amber-700 shrink-0" />
            <div className="flex flex-col text-left w-full overflow-hidden">
              <span className="text-[10px] tracking-wider uppercase text-stone-500 font-bold">
                Where’s The Celebration?
              </span>
              <select
                aria-label="Search location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-transparent text-sm text-stone-900 focus:outline-none cursor-pointer w-full font-medium"
              >
                <option value="">Select location</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="md:col-span-3 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl sm:rounded-full bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-amber-50 font-medium text-sm tracking-wide shadow-md shadow-amber-900/15 transition-all hover:scale-[1.01] active:scale-95"
          >
            <span>Let’s find it</span>
            <Search size={15} />
          </button>
        </form>
      </div>
    </section>
  );
}