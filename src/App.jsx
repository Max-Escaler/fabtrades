import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home.jsx';
import FAQs from './pages/FAQs.jsx';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/faqs" element={<FAQs />} />
            </Routes>
        </Router>
    );
}

export default App;