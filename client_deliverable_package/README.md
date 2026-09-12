# Project Deliverables & Demonstration Package

This package contains the compiled frontend demonstration build and mobile application binaries for client review.

## 📦 Package Structure

```
client_deliverable_package/
├── web_dist/              # Compiled Web Application (Static HTML/JS bundle)
├── apks/                  # Android Application Binaries (APK files)
│   ├── deliveries-app-release.apk
│   └── sales-app-release.apk
├── README.md              # Package documentation
└── SYSTEM_OVERVIEW.md     # Feature and architecture overview for client review
```

---

## 🚀 How to Use / Preview

### 1. Web Application (`web_dist/`)
- Open `web_dist/index.html` directly in any modern web browser or serve via any static web server (Nginx, Caddy, Apache, or local static server).
- **Note:** The web build is a pre-compiled client UI bundle.

### 2. Mobile Applications (`apks/`)
- **Deliveries App:** `apks/deliveries-app-release.apk`
- **Sales & Operations App:** `apks/sales-app-release.apk`
- **Installation:** Download the APK files onto an Android device, enable *"Install from unknown sources"* if prompted, and launch the installer.
