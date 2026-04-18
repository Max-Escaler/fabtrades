import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home.jsx';
import TradeHistory from './pages/TradeHistory.jsx';
import SetList from './pages/SetList.jsx';
import SetDetail from './pages/SetDetail.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/history" element={<TradeHistory />} />
                    <Route path="/sets" element={<SetList />} />
                    <Route path="/sets/:groupId" element={<SetDetail />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;