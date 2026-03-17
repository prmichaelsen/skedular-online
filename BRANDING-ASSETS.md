# Skedular Branding Assets

## ✅ Generated Assets

All assets generated from `assets/skedular_icon.png`

### Favicons
- **favicon.ico** (multi-size: 16×16, 32×32, 48×48) - Browser tab icon
- **favicon-16x16.png** - Small favicon
- **favicon-32x32.png** - Standard favicon
- **favicon-48x48.png** - Large favicon

### Mobile & PWA Icons
- **apple-touch-icon.png** (180×180) - iOS home screen icon
- **icon-192.png** (192×192) - PWA icon (small)
- **icon-512.png** (512×512) - PWA icon (large)

### Social Media
- **og-image.png** (1200×630) - Open Graph image for Facebook, Twitter, LinkedIn

### PWA Manifest
- **manifest.json** - Web app manifest for Progressive Web App support

## 🌐 Implementation

### HTML Meta Tags
Added to `src/routes/__root.tsx`:

```typescript
// PWA Meta Tags
{ name: 'theme-color', content: '#3b82f6' }
{ name: 'apple-mobile-web-app-capable', content: 'yes' }
{ name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
{ name: 'apple-mobile-web-app-title', content: 'Skedular' }

// Open Graph (Facebook, LinkedIn)
{ property: 'og:type', content: 'website' }
{ property: 'og:title', content: 'Skedular — Simple Online Scheduling' }
{ property: 'og:description', content: 'Paint your availability, share a link...' }
{ property: 'og:image', content: 'https://skedular.online/og-image.png' }
{ property: 'og:url', content: 'https://skedular.online' }

// Twitter Card
{ name: 'twitter:card', content: 'summary_large_image' }
{ name: 'twitter:title', content: 'Skedular — Simple Online Scheduling' }
{ name: 'twitter:description', content: 'Paint your availability, share a link...' }
{ name: 'twitter:image', content: 'https://skedular.online/og-image.png' }
```

### Icon Links
```typescript
{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
{ rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }
{ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }
{ rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
{ rel: 'manifest', href: '/manifest.json' }
```

## 🎨 Design Specs

### Brand Colors
- **Primary Blue**: `#3b82f6` (theme color)
- **Background**: `#ffffff` (white)

### Icon Design
- **Base**: Rounded square with calendar icon
- **Visual**: Calendar grid with checkmark
- **Text**: "SKEDULAR" wordmark below icon
- **Style**: Clean, modern, professional

## 📱 Platform Support

### Browsers
- ✅ Chrome/Edge - favicon.ico + PNG favicons
- ✅ Firefox - favicon.ico + PNG favicons
- ✅ Safari - apple-touch-icon.png + favicons

### Mobile
- ✅ iOS - apple-touch-icon.png (home screen)
- ✅ Android - PWA icons via manifest.json

### PWA Features
- ✅ Installable as standalone app
- ✅ Home screen shortcut to dashboard
- ✅ Theme color matches brand
- ✅ Splash screen support

### Social Media
- ✅ Facebook - og-image.png (1200×630)
- ✅ Twitter - twitter:card with og-image.png
- ✅ LinkedIn - og-image.png
- ✅ Slack - Open Graph preview
- ✅ Discord - Open Graph embed

## 🧪 Testing

### Browser Tab Icon
1. Visit https://skedular.online
2. Verify blue calendar icon in browser tab

### iOS Home Screen
1. Open Safari on iPhone/iPad
2. Tap Share → Add to Home Screen
3. Verify blue calendar icon with "Skedular" label

### Android Home Screen
1. Open Chrome on Android
2. Tap menu → Add to Home Screen
3. Verify blue calendar icon

### Social Media Preview
1. Share https://skedular.online link
2. Verify calendar icon appears in preview
3. Check title and description display correctly

### PWA Installation
1. Visit site in Chrome
2. Look for install prompt in address bar
3. Click Install
4. Verify app opens in standalone mode

## 📦 Files Location

```
public/
├── apple-touch-icon.png    (33 KB)
├── favicon-16x16.png       (1.9 KB)
├── favicon-32x32.png       (2.8 KB)
├── favicon-48x48.png       (4.6 KB)
├── favicon.ico            (15 KB)
├── icon-192.png           (36 KB)
├── icon-512.png          (166 KB)
├── og-image.png          (227 KB)
└── manifest.json          (0.8 KB)

Total: ~487 KB
```

## 🔄 Regeneration

To regenerate icons from source image:

```bash
cd /home/prmichaelsen/.acp/projects/skedular

# Favicons
magick assets/skedular_icon.png -resize 16x16 public/favicon-16x16.png
magick assets/skedular_icon.png -resize 32x32 public/favicon-32x32.png
magick assets/skedular_icon.png -resize 48x48 public/favicon-48x48.png
magick public/favicon-{16x16,32x32,48x48}.png public/favicon.ico

# Mobile & PWA
magick assets/skedular_icon.png -resize 180x180 public/apple-touch-icon.png
magick assets/skedular_icon.png -resize 192x192 public/icon-192.png
magick assets/skedular_icon.png -resize 512x512 public/icon-512.png

# Social Media
magick assets/skedular_icon.png -resize 1200x630 -gravity center \
  -extent 1200x630 -background "#3b82f6" public/og-image.png
```

## 🚀 Deployment Status

✅ **Deployed**: All assets live at https://skedular.online
✅ **CDN**: Cloudflare edge caching enabled
✅ **Version**: Deployed with commit `b1c2e76`

---

**Last Updated**: 2026-03-17
**Status**: Complete and deployed
