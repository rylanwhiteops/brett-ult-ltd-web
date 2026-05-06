'use client';

import { useEffect } from 'react';

const GHL_EMBED_URL = 'https://api.leadconnectorhq.com/widget/form/MXTjMlYmVD9a1qrWQDyA';

export default function CareersForm() {
  useEffect(() => {
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
      id="ghl-careers-form"
      title="Careers Application"
    />
  );
}
