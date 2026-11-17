# Preeti's 18th Birthday Celebration

A lightweight, self-contained birthday experience built with HTML, CSS, SVG and vanilla JavaScript. It has no package installation, backend, external assets, or network dependencies. The cake is intentionally stationary; its illustrated tiers, highlights, shadows and frosting remain facing the viewer.

## Run locally

Open `index.html` in Chrome, or serve this folder with any static file server. The site also works when opened directly from disk. The countdown uses the actual moment `18 November 2026, 12:00 AM` in India Standard Time. Before then it shows the live countdown; from midnight IST onward it begins or resumes the celebration.

Progress is saved in this browser so a refresh after midnight resumes the current scene, Wonderland discoveries and extinguished candles. The sound control is optional; the experience works without sound or Web Audio support.

## Preview before the birthday

Open `index.html?preview=1` to try the experience now. The preview starts at Welcome and adds Previous/Next controls for the countdown, calendar, welcome, cake, Wonderland and final scenes. The normal countdown reveals the animated November calendar and heart at midnight IST, then opens directly on the birthday cake. Enter Wonderland from the cake whenever you like: tap the Wish Jar for several notes, pick any of the 18 stars for a compliment, or light the Birthday Mirror. None is required before returning to the cake. The cake stays stationary throughout the celebration. Tap the 18 candles (or use the blow-candles button), then hold and drag the knife across the cake to cut it. A short cut can be cleared with **Reset Cut**. Preview actions are temporary and do not change saved progress or bypass the countdown on the normal URL.

## Publish with GitHub Pages

1. Add these files to the root of a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the branch and `/ (root)`, then save.
4. Open the published Pages address after deployment. All file references are relative, so no build step is needed.

## Link the second birthday website

The final surprise button opens the existing PREETI-BIRTHDAY-WORLD website in a new tab. If that site's published address changes, update `SECOND_BIRTHDAY_WEBSITE_URL` in `script.js`. No video or friends' wishes content is included here.