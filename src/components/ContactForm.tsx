'use client';

import { useState, type FormEvent } from 'react';

/**
 * Native contact form — styled to match the site.
 *
 * Form backend options (pick one and set FORM_ACTION):
 * - Formspree: https://formspree.io  → "https://formspree.io/f/YOUR_FORM_ID"
 * - Resend:    custom API endpoint   → "/api/contact"
 * - Email:     mailto fallback       → "mailto:brett@ultimatefire.ca"
 *
 * Set the FORM_ACTION below once you have your endpoint.
 */
const FORM_ACTION = ''; // ← PASTE YOUR FORM ENDPOINT HERE

const JOB_TYPES = [
  'Fire Suppression System',
  'Sprinkler Design & Engineering',
  'Annual Inspection & Testing',
  'Emergency Service & Repair',
  'New Construction',
  'Retrofit / Renovation',
  'Other',
];

const inputBase =
  'w-full bg-[#0a0a0a] border border-[#D4AF37]/15 text-[#F5F0E8] text-sm px-5 py-4 ' +
  'placeholder:text-[#909090]/50 focus:outline-none focus:border-[#D4AF37]/50 transition-colors duration-200';

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    const form = e.currentTarget;
    const data = new FormData(form);

    // If no form action configured, fall back to mailto
    if (!FORM_ACTION) {
      const name = data.get('name') as string;
      const email = data.get('email') as string;
      const phone = data.get('phone') as string;
      const jobType = data.get('jobType') as string;
      const message = data.get('message') as string;

      const subject = encodeURIComponent(`New Inquiry from ${name} — ${jobType}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nJob Type: ${jobType}\n\n${message}`
      );
      window.location.href = `mailto:brett@ultimatefire.ca?subject=${subject}&body=${body}`;
      return;
    }

    try {
      const res = await fetch(FORM_ACTION, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setSubmitted(true);
        form.reset();
      } else {
        setError('Something went wrong. Please call us directly at (905) 664-0061.');
      }
    } catch {
      setError('Something went wrong. Please call us directly at (905) 664-0061.');
    }
  }

  if (submitted) {
    return (
      <div className="border border-[#D4AF37]/20 bg-[#0f0f0f] p-12 text-center">
        <div className="w-12 h-12 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
          <span className="text-[#D4AF37] text-xl">✓</span>
        </div>
        <p className="text-[#A08928] text-[10px] font-semibold tracking-[0.35em] uppercase mb-3">
          Message Sent
        </p>
        <p className="text-[#F5F0E8] text-xl font-bold mb-3">Brett will be in touch.</p>
        <p className="text-[#9B9487] text-sm" style={{ lineHeight: '1.78' }}>
          All consultation requests are reviewed and responded to the same business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name + Email row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          name="name"
          placeholder="Full Name"
          required
          className={inputBase}
        />
        <input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          className={inputBase}
        />
      </div>

      {/* Phone + Job Type row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          className={inputBase}
        />
        <select
          name="jobType"
          required
          className={`${inputBase} appearance-none cursor-pointer`}
          defaultValue=""
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23D4AF37' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1.25rem center',
          }}
        >
          <option value="" disabled>
            Job Type
          </option>
          {JOB_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <textarea
        name="message"
        placeholder="Tell us about your project..."
        rows={5}
        required
        className={`${inputBase} resize-none`}
      />

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center px-12 py-5 text-sm font-bold tracking-[0.2em] uppercase bg-[#D4AF37] text-[#080808] hover:bg-[#f7e98e] transition-colors duration-300 cursor-pointer"
      >
        Talk to Brett →
      </button>
    </form>
  );
}
