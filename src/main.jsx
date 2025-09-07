import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import {CardDataProvider} from "./hooks/useCardData.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CardDataProvider>
      <App />
    </CardDataProvider>
  </StrictMode>,
)
