# Vision Agentic AI — Mobile App (React Native / Expo)

## 📁 Project Structure
```
mobile_app/
├── app/
│   ├── _layout.tsx              ← Root navigation stack
│   ├── index.tsx                ← Animated Splash screen
│   ├── auth/
│   │   ├── login.tsx            ← Login screen
│   │   └── register.tsx         ← Register screen
│   ├── (tabs)/
│   │   ├── _layout.tsx          ← Tab bar with glassmorphism + FAB
│   │   ├── home.tsx             ← Dashboard with stats + CTA
│   │   ├── new_session.tsx      ← Session setup (name, language)
│   │   ├── sessions.tsx         ← Past sessions list
│   │   ├── reports.tsx          ← PDF report generation
│   │   └── profile.tsx          ← Profile + quick actions
│   ├── interview/
│   │   └── [sessionId].tsx      ← LIVE interview (WS + Camera + Mic)
│   └── results/
│       └── [sessionId].tsx      ← AI Diagnosis results + PDF/email
├── constants/
│   └── theme.ts                 ← Colors, spacing, API URLs
├── services/
│   ├── authService.ts           ← Login, register, logout
│   └── sessionService.ts        ← Sessions, PDF, email
├── package.json
├── app.json
├── babel.config.js
└── tsconfig.json
```

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your phone (or Android/iOS emulator)

### Steps
```bash
cd mobile_app

# Install dependencies
npm install

# Update the API URL in constants/theme.ts
# Set API_BASE_URL and WS_BASE_URL to your FastAPI server IP

# Start Expo
npx expo start

# Scan the QR code with Expo Go app
```

### ⚠️ Important — Update API URL
Open `constants/theme.ts` and change:
```ts
export const API_BASE_URL = 'http://192.168.1.100:8000';  // ← Your PC's local IP
export const WS_BASE_URL  = 'ws://192.168.1.100:8000';    // ← Your PC's local IP
```
Find your local IP by running `ipconfig` in PowerShell and using the IPv4 address.

## 📱 Screens Overview

| Screen | Description |
|--------|-------------|
| **Splash** | Animated logo with pulsing glow, auto-redirect based on auth |
| **Login** | Glassmorphism card, gradient button, form validation |
| **Register** | Gold gradient theme, structured multi-field form |
| **Home Dashboard** | Animated CTA, stats grid, feature cards |
| **New Session** | Name, age, language selector (10+ languages), step hints |
| **Live Interview** | Camera feed, WebSocket chat, animated mic button, bio-vision overlay |
| **Results** | Confidence bar, symptom chips, dual care plan, PDF/email actions |
| **Sessions** | Pull-to-refresh list, emotion icons, confidence badges |
| **Reports** | Per-session PDF generation and download |
| **Profile** | Avatar, usage stats, tech stack info, sign out |
