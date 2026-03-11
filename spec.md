# Wall Pop

## Current State
Fully functional AI wallpaper generation app with:
- Internet Identity login
- Text-to-image generation via Pollinations.ai
- Image upload for style reference
- Art Style dropdown (textToImage, imageToImage, classicPainting, sketch, photo, mixedMedia)
- Undo/redo, regenerate, download
- Auto-save to gallery with delete and download
- Black/white theme with skull-flames background
- Processing spinner

## Requested Changes (Diff)

### Add
- Style Picker dropdown above the prompt textarea in GenerateSection
  - Options: None (default), Retro 80s, 90s Grunge, Neon Glow, Monochrome, Chrome Metallic, Offset Print, Surreal Dream, Minimalist Line Art
  - Each option has keyword strings that get appended to the prompt when generating
  - Keywords:
    - Retro 80s: "neon grids, synthwave, retro 80s aesthetic, vibrant neon colors"
    - 90s Grunge: "grunge aesthetic, faded, ripped edges, 90s distressed texture"
    - Neon Glow: "cyberpunk neon, glowing pink and blue, neon lights, futuristic"
    - Monochrome: "black and white, high contrast monochrome, dramatic shadows"
    - Chrome Metallic: "chrome metallic, shiny reflective surface, liquid metal"
    - Offset Print: "vintage halftone, offset print, retro poster art"
    - Surreal Dream: "surrealist, melting objects, floating, dreamlike"
    - Minimalist Line Art: "minimalist, clean line art, simple outlines, geometric"
  - Selection is purely frontend state — not persisted to backend
  - When style is selected, keywords are silently appended to prompt at generation time (not shown in prompt box)
  - Label shows currently selected style name

### Modify
- buildPollinationsUrl: append selected style keywords to the prompt before encoding
- GenerateSection layout: add Style Picker between the Reference Image section and the existing Art Style dropdown

### Remove
- Nothing

## Implementation Plan
1. Add STYLE_PRESETS constant in GenerateSection mapping style name -> keyword string
2. Add selectedStyle state (default: "none")
3. Add Style Picker Select component between Reference Image and Art Style sections
4. Update buildPollinationsUrl to append selectedStyle keywords if not "none"
5. Update data-ocid markers for style picker: generate.style_picker_select
