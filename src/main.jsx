import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ThemeProvider from './themes/ThemeProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><App /></ThemeProvider>
  </StrictMode>,
)
