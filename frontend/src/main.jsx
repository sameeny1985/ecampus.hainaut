import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Hide the static fallback when React loads
const staticContent = document.querySelector('header, .hero, .features, footer')
if (staticContent) {
  document.querySelectorAll('header, section, footer').forEach(el => {
    if (!el.closest('#root')) el.style.display = 'none'
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
