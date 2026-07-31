import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import TradeHistory from './pages/TradeHistory.jsx';
import SetList from './pages/SetList.jsx';
import SetDetail from './pages/SetDetail.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsOfUse from './pages/TermsOfUse.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { EntitlementProvider } from './contexts/EntitlementContext.jsx';

function App() {
    return (
        <AuthProvider>
            {/* Inside AuthProvider: the entitlement is keyed by the signed-in user. */}
            <EntitlementProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/history" element={<TradeHistory />} />
                        <Route path="/sets" element={<SetList />} />
                        <Route path="/sets/:groupId" element={<SetDetail />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/terms" element={<TermsOfUse />} />
                    </Routes>
                </Router>
            </EntitlementProvider>
        </AuthProvider>
    );
}

export default App;