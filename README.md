<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SuiCloud - Decentralized Storage Application

A React.js web application for secure, decentralized file storage using the Walrus Protocol and zkLogin authentication powered by Sui Network.

## Migration from Next.js to React.js

This project has been successfully migrated from Next.js to React.js with the following changes:

### Key Changes:
- **Build Tool**: Migrated from Next.js to **Vite** for faster development and builds
- **Routing**: Replaced Next.js routing with **React Router v6**
- **Entry Point**: Traditional React app with `src/main.tsx` entry point and `public/index.html`
- **Environment Variables**: Updated from `NEXT_PUBLIC_*` to `VITE_*` prefix
- **Folder Structure**: Assets now organized in `src/` directory instead of root-level `pages/`

### Project Structure:
```
src/
├── components/          # Reusable React components
│   ├── FileGrid.tsx
│   └── Sidebar.tsx
├── contexts/           # React Context API (AuthContext)
├── pages/             # Page-level components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   └── Dashboard.tsx
├── services/          # Firebase and Walrus service integrations
├── styles/            # Tailwind CSS and global styles
├── App.tsx            # Main app component with routing
└── main.tsx           # Entry point
```

## Run Locally

**Prerequisites:**
- Node.js (v18 or higher)
- npm or yarn

### Setup:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env.local`
   - Add your Google Client ID from [Google Cloud Console](https://console.cloud.google.com/):
     ```env
     VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run start
   ```

## zkLogin Setup Guide

zkLogin enables passwordless authentication using your Google account with zero-knowledge proofs.

### Getting Your Google Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the "Google+ API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Add authorized JavaScript origins: `http://localhost:5173` (and your production domain)
   - Add authorized redirect URIs: `http://localhost:5173/` (and your production URL)
5. Copy your Client ID and add it to `.env.local`

### How zkLogin Works:

- zkLogin leverages Google's OAuth to authenticate users
- Creates a Sui-compatible wallet using zero-knowledge proofs
- No private keys are exposed to the application
- Users maintain full control of their identity through Google

For more details, see the [Sui zkLogin Documentation](https://docs.sui.io/concepts/cryptography/zklogin)

## Features

- ✨ **zkLogin Authentication**: Passwordless Google login with zero-knowledge proofs
- 📁 **Decentralized Storage**: Files uploaded to Walrus Protocol
- 🎨 **Modern UI**: Built with Tailwind CSS and Lucide React icons
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Fast Development**: Powered by Vite
- 🔒 **Web3 Native**: Built on Sui Network infrastructure

## Technologies

- **Frontend Framework**: React 19
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Authentication**: zkLogin (Sui Network)
- **File Storage**: Walrus Protocol
- **HTTP Client**: Axios
- **Blockchain**: Sui Network SDK

## Demo Credentials

For testing without Firebase configuration:
- Click "Demo Access (No Keys)" on the login page
- Uses local storage for demo user persistence
