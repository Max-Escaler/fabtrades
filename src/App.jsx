import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home.jsx';
import TradeHistory from './pages/TradeHistory.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/history" element={<TradeHistory />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;