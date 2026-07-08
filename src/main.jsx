import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// No StrictMode: its double mount/unmount re-initializes the rapier physics
// world twice, which produces spurious ball positions on level transitions.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
