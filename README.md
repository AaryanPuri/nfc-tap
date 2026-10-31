# NFC-Tap

The landing page behind my NFC tag. Tap the tag and a live WebGL hero launches on your phone, with my links shown as a heads-up display.

**Live:** https://tap.aaryanpuri.me

## Stack

Plain HTML, CSS and JavaScript with [Three.js](https://threejs.org), hosted on Vercel. There's no build step.

The page steps down its quality on slow phones and falls back to a still image when WebGL isn't available. The links work either way.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page markup and styles |
| `hero.js` | WebGL scene, layout and quality fallbacks |
| `hero-image.js` | Hero image, embedded as a data URI |
| `poster-*.jpg` | Still images for the no-WebGL fallback |
| `aaryan-puri.vcf` | Contact card for the Save contact button |
| `vercel.json` | Serves the contact card with the right headers |


