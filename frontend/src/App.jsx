import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import ReportBuilder from './ReportBuilder';
import AiAssistant from './AiAssistant';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/claims" element={<ReportBuilder reportType="claims" title="Claims Report Builder" />} />
          <Route path="/cea" element={<ReportBuilder reportType="cea" title="Customer Experience Advocate (CEA) Report Builder" />} />
          <Route path="/complaints" element={<ReportBuilder reportType="complaints" title="Complaints Report Builder" />} />
          <Route path="/connected-benefits" element={<ReportBuilder reportType="connected_benefits" title="Connected Benefits Report Builder" />} />
          <Route path="/ai-assistant" element={<AiAssistant />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
