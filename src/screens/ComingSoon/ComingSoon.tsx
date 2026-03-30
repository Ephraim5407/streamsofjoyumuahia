import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type ComingSoonProps = {
  /** Optional headline displayed above the primary title */
  tag?: string;
  /** Primary title, defaults to "Coming Soon" */
  title?: string;
  /** Supporting subtitle displayed under the title */
  subtitle?: string;
  /** Longer descriptive copy shown near the bottom */
  message?: string;
  /** Hide the looping video if a simple gradient background is preferred */
  hideVideo?: boolean;
};

const DARK_NAVY = '#041522';
const MIDNIGHT = '#01070C';
const ACCENT_BLUE = '#1C9CD8';
const MUTED_WHITE = 'rgba(255,255,255,0.86)';

export const ComingSoon = ({
  tag = 'Stay tuned',
  title = 'Coming Soon',
  subtitle = 'We are preparing something special for you.',
  message = 'Our team is giving this feature a final polish. Check back shortly for the full experience.',
  hideVideo = false,
}: ComingSoonProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play sound from public/sound if available
    const playSound = async () => {
       if (audioRef.current) {
        try {
          audioRef.current.volume = 0.25;
          await audioRef.current.play();
        } catch (e) {
          // Playback blocked, continue silently
        }
      }
    };
    playSound();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-[90vh] w-full text-center relative overflow-hidden" 
         style={{ backgroundColor: MIDNIGHT, fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{ background: `linear-gradient(135deg, ${DARK_NAVY} 0%, ${MIDNIGHT} 90%)` }} />

      <audio ref={audioRef} src="/sound/notification_sound.mp3" />

      {/* Video Hero Section */}
      {!hideVideo && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative w-full max-w-[420px] aspect-video rounded-3xl overflow-hidden mt-12 mx-auto border border-[#1C9CD840] shadow-2xl z-10"
        >
          <video 
            src="/video/logo_animation.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Bottom Fade on Video */}
          <div className="absolute inset-0 pointer-events-none" 
               style={{ background: `linear-gradient(transparent, ${MIDNIGHT}F0)` }} />
        </motion.div>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center px-6 mt-12 z-10">
        {tag && (
          <motion.span 
            initial={{ opacity: 0, letterSpacing: '0.1em' }}
            animate={{ opacity: 1, letterSpacing: '0.2em' }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-[#1C9CD8] text-[12px] font-black uppercase tracking-[0.2em] mb-4"
          >
            {tag}
          </motion.span>
        )}

        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight"
          style={{ color: MUTED_WHITE }}
        >
          {title}
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-[16px] max-w-[340px] leading-relaxed mb-16 mx-auto"
          style={{ color: 'rgba(255,255,255,0.68)' }}
        >
          {subtitle}
        </motion.p>
      </div>

      {/* Footer Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="relative w-full max-w-[420px] rounded-3xl p-8 bg-[#01070C]/80 border border-white/5 mx-auto mb-10 overflow-hidden z-20 shadow-xl"
      >
        {/* Glow Element */}
        <div className="absolute inset-0 pointer-events-none" 
             style={{ background: `linear-gradient(135deg, ${ACCENT_BLUE}33, transparent)` }} />

        <h4 className="text-white text-lg font-bold mb-3" style={{ color: MUTED_WHITE }}>What to expect</h4>
        <p className="text-[14px] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.74)' }}>
          {message}
        </p>
        <p className="text-[#1C9CD8] text-[12px] font-bold uppercase tracking-wider opacity-60">
          We will let you know the moment it is live.
        </p>
      </motion.div>

      {/* Interaction Ripple */}
      <div className="mt-auto pb-12 opacity-30">
        <div className="flex gap-2">
          {[1,2,3].map(i => (
            <motion.div 
              key={i}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
              className="w-1.5 h-1.5 rounded-full bg-[#1C9CD8]" 
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
