import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CardDataProvider } from './inputs/cardDataProvider.jsx';
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = "10377464258-011q3ae95qqs58h7f91bqbhsc2bh0qf7.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId = {CLIENT_ID}>
    <CardDataProvider>
      <App />
    </CardDataProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
