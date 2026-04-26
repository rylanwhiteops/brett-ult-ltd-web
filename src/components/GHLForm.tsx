'use client';

import { useEffect } from 'react';

const GHL_EMBED_URL = 'https://api.leadconnectorhq.com/widget/form/IIF8oJfuJz71mN6VHS9W';

export default function GHLForm() {
  useEffect(() => {
    // Load GHL's form-embed script — auto-resizes the iframe to fit content
    const id = 'ghl-form-embed-script';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://link.msgsndr.com/js/form_embed.js';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <iframe
      src={GHL_EMBED_URL}
      style={{
        width: '100%',
        minHeight: '900px',
        border: 'none',
        background: 'transparent',
        display: 'block',
      }}
      id="ghl-contact-form"
      title="Contact Form"
    />
  );
}
