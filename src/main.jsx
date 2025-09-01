import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CardDataProvider } from './inputs/cardDataProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CardDataProvider>
      <App />
    </CardDataProvider>
  </StrictMode>,
)
