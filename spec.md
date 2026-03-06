# Wall Pop AI Image Generation PWA

## Current State
- Full-stack app with Motoko backend (image CRUD, blob storage, auth) and React/Tailwind frontend.
- Skull-and-flames background image used as full-page background.
- GenerateSection handles prompt input, style dropdown, image-to-image upload (shown only when type = imageToImage), undo/redo, and a fake canvas-based placeholder generator.
- GallerySection shows saved images from backend with download/delete.
- Header has logo, login/logout, admin toggle.
- Backend has http-outcalls module (outcall.mo) available for making external API calls.
- Current issue: text/labels/buttons/dropdowns blend into the busy background — hard to read. Image generation is a placeholder canvas, not a real AI call. Upload is only shown for imageToImage type. Gallery is a separate tab only.

## Requested Changes (Diff)

### Add
- Semi-transparent black overlay/shadow boxes behind every label, input, button, dropdown, and card so white text stays sharp against the flames/skull background.
- Bold font weight on all UI text labels, inputs, and buttons.
- Real AI image generation via Pollinations.ai free API (no API key required) — GET https://image.pollinations.ai/prompt/{encoded-prompt}?width=512&height=512&nologo=true returns image directly. Used as src URL for instant display.
- "Processing..." spinner overlay while image generates (fetch the image, show spinner until load complete).
- Image upload button always visible next to the prompt box (not just when imageToImage type is selected) — a small camera/upload icon button beside the textarea.
- When upload is provided, append "img2img style" context to prompt or note it visually.
- Auto-save every generated image to the Gallery tab via the existing createImage backend call (already partially done; ensure it fires on success).
- Download button on each generated image card in the Generate view (already present — ensure it works with blob URL).
- Gallery tab: download button per image (already exists — confirm visibility and bold styling).

### Modify
- GenerateSection: replace fake canvas generator with Pollinations.ai URL fetch. Show spinner while loading. Show image inline immediately on success.
- Upload button: always visible above/beside the prompt, not gated on imageToImage type.
- All Card, Label, Input, Textarea, Select, Button, Dropdown elements: add `bg-black/70 backdrop-blur-sm` backgrounds and ensure `text-white font-bold` on labels.
- The style/type selector: ensure it's always shown and has strong background contrast.
- Generated image result: display prominently right below the generate button, full width, no tab switch required.

### Remove
- Conditional rendering that hides the upload button unless imageToImage is selected.
- The fake `generateImageBlob` canvas placeholder function (replace entirely with Pollinations URL approach).

## Implementation Plan
1. **GenerateSection.tsx** — Complete rewrite of generation logic:
   - Remove `generateImageBlob` canvas function.
   - Add `isLoading` image state (separate from `isGenerating` spinner on button).
   - Use Pollinations.ai URL: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${random}` as image src.
   - Show spinner overlay on the image area while fetching (use `<img onLoad>` to detect completion).
   - Move upload button to always-visible position above the prompt textarea.
   - When upload exists, append `(based on uploaded image)` to the displayed prompt context.
   - Auto-save to backend on successful generation.
   - All UI elements get `bg-black/70 backdrop-blur-sm` backgrounds, `text-white font-bold` labels.

2. **GallerySection.tsx** — Style audit:
   - Ensure all text is bold and white with dark backgrounds on cards.
   - Download button clearly styled and visible.

3. **HomePage.tsx** — Tab styling:
   - Ensure tab bar has solid dark background with good contrast.

4. **Header.tsx** — Ensure all text/buttons have dark overlay backgrounds.

5. **index.css / global styles** — Add utility class for UI overlay if needed.
