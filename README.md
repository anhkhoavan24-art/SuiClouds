<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SuiCloud - Decentralized Storage Application

A React.js web application for secure, decentralized file storage using the Walrus Protocol and Firebase authentication.

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
   - Add your Firebase API key:
     ```env
     VITE_FIREBASE_API_KEY=your_firebase_api_key_here
     ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run start
   ```

## Features

- ✨ **Secure Authentication**: Google login and demo access via Firebase
- 📁 **Decentralized Storage**: Files uploaded to Walrus Protocol
- 🎨 **Modern UI**: Built with Tailwind CSS and Lucide React icons
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ⚡ **Fast Development**: Powered by Vite

## Technologies

- **Frontend Framework**: React 19
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Context API
- **Authentication**: Firebase
- **File Storage**: Walrus Protocol
- **HTTP Client**: Axios

## Demo Credentials

For testing without Firebase configuration:
- Click "Demo Access (No Keys)" on the login page
- Uses local storage for demo user persistence
