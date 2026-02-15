import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { I18nProvider } from './i18n'
import './styles/global.css?v=2'

// Debug log
console.log('main.jsx is loading...');
console.log('React:', StrictMode);
console.log('Root element:', document.getElementById('root'));

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  console.log('Creating React root...');
  createRoot(rootElement).render(
    <StrictMode>
    <BrowserRouter>
      <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
    </StrictMode>,
  )
  console.log('React app rendered!');
}
