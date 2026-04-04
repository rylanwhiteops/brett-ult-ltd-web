'use client';

/**
 * GoHighLevel Form Embed
 *
 * To activate: replace GHL_EMBED_URL with your actual GHL funnel/form URL.
 * In GHL: Funnels → your form → Share → Copy Embed Code (iframe src URL)
 *
 * Example: https://api.leadconnectorhq.com/widget/form/xxxxxxxxxxxxxxxx
 */

const GHL_EMBED_URL = ''; // ← PASTE YOUR GHL FORM URL HERE

export default function GHLForm() {
  if (!GHL_EMBED_URL) {
    return (
      <div className="w-full border border-[#D4AF37]/20 bg-[#0f0f0f] flex flex-col items-center justify-center text-center p-16 min-h-[400px]">
        <div className="w-10 h-10 border border-[#D4AF37]/30 flex items-center justify-center mb-6">
          <span className="text-[#D4AF37] text-xl">◈</span>
        </div>
        <p className="text-[#A08928] text-[10px] font-semibold tracking-[0.35em] uppercase mb-3">
          GHL Form
        </p>
        <p className="text-[#F5F0E8]/40 text-sm max-w-xs leading-relaxed">
          Paste your GoHighLevel embed URL into{' '}
          <code className="text-[#D4AF37]/60 text-xs">GHLForm.tsx</code>{' '}
          to activate this form.
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={GHL_EMBED_URL}
      style={{
        width: '100%',
        minHeight: '600px',
        border: 'none',
        background: 'transparent',
      }}
      scrolling="no"
      id="ghl-contact-form"
      title="Contact Form"
    />
  );
}
