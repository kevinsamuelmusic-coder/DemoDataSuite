import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DownloadCloud, Home as HomeResult, MessageSquare, Activity, Settings, Lock } from 'lucide-react';

const reportOptions = [

    { id: 'claims', label: 'Option 1', desc: 'Description for Option 1.', icon: DownloadCloud, route: '/claims' },
    { id: 'enrollment', label: 'Option 2', desc: 'Description for Option 2.', icon: DownloadCloud, route: null },
    { id: 'invoice', label: 'Option 3', desc: 'Description for Option 3.', icon: DownloadCloud, route: null },
    { id: 'complaints', label: 'Option 4', desc: 'Description for Option 4.', icon: DownloadCloud, route: '/complaints' },
    { id: 'connected_benefits', label: 'Option 5', desc: 'Description for Option 5.', icon: DownloadCloud, route: '/connected-benefits' },
    { id: 'appeals', label: 'Option 6', desc: 'Description for Option 6.', icon: DownloadCloud, route: null },
    { id: 'bi_data', label: 'Option 7', desc: 'Description for Option 7.', icon: DownloadCloud, route: null },
    { id: 'nps', label: 'Option 8', desc: 'Description for Option 8.', icon: DownloadCloud, route: null },
    { id: 'void_reissue', label: 'Option 9', desc: 'Description for Option 9.', icon: DownloadCloud, route: null },
    { id: 'cea', label: 'Option 10', desc: 'Description for Option 10.', icon: DownloadCloud, route: '/cea' },
];

const Home = () => {
    const [viewMode, setViewMode] = useState('selection'); // 'selection' | 'preconfigured' | 'build'
    const [selectedDataSource, setSelectedDataSource] = useState('');

    const navigate = useNavigate();

    const handleBuildStart = () => {
        const option = reportOptions.find(opt => opt.id === selectedDataSource);
        if (option && option.route) {
            navigate(option.route, { state: { custom: true } });
        } else {
            alert('This report type is coming soon!');
        }
    };

    return (
        <>
            <aside className="sidebar">
                <div className="logo" style={{ marginBottom: '40px', paddingLeft: '8px' }}>
                    <img src="/demo_logo.png" alt="Demo Report" style={{ height: '40px', objectFit: 'contain' }} />
                </div>
                <nav className="nav">
                    <Link to="/" className="active" onClick={() => setViewMode('selection')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', opacity: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <HomeResult size={20} />
                            <span>Dashboard</span>
                        </div>
                        <div style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '50%' }}></div>
                    </Link>
                    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.7 }} onClick={() => alert('Contact clicked')}>
                        <MessageSquare size={20} />
                        <span>Contact</span>
                    </a>
                </nav>
            </aside>

            <main className="main">
                <div id="dashboardView" className="max-w-6xl mx-auto">
                    <header className="header mb-8">
                        <div className="title-group">
                            <div className="title">Analytics & Reporting</div>
                            <div className="subtitle">Select a report mode to customize or download data.</div>
                        </div>
                    </header>

                    {viewMode === 'selection' && (
                        <div className="grid grid-cols-3 gap-8 mt-10">
                            {/* Pre-configured Option */}
                            <div
                                onClick={() => setViewMode('preconfigured')}
                                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 flex flex-col items-center text-center gap-4 group"
                            >
                                <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Pre-configured Reports</h3>
                                    <p className="text-gray-500">Access standard, ready-to-use report templates for quick insights.</p>
                                </div>
                                <div className="mt-4 flex items-center text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Reports <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>
                            </div>

                            {/* Build Option */}
                            <div
                                onClick={() => setViewMode('build')}
                                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 flex flex-col items-center text-center gap-4 group"
                            >
                                <div className="p-4 bg-purple-50 rounded-full group-hover:bg-purple-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Build Custom Report</h3>
                                    <p className="text-gray-500">Create tailored reports by selecting specific data sources and columns.</p>
                                </div>
                                <div className="mt-4 flex items-center text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Start Building <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>
                            </div>

                            {/* AI Assistant Option */}
                            <Link
                                to="/ai-assistant"
                                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 flex flex-col items-center text-center gap-4 group"
                            >
                                <div className="p-4 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="m4.93 19.07 4.25-4.25" /><path d="m14.83 9.17 4.24-4.24" /><path d="M14.83 9.17 19.07 4.93" /><path d="M14.83 9.17 19.07 13.41" /><path d="M4.93 19.07 9.17 14.83" /><path d="M4.93 19.07 9.17 23.31" /><path d="M9 2v2" /><path d="M15 2v2" /><path d="M12 2v2" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M12 20v2" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">AI Assistant</h3>
                                    <p className="text-gray-500">Use predictive analytics and insights to drive decisions.</p>
                                </div>
                                <div className="mt-4 flex items-center text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open Assistant <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                </div>
                            </Link>
                        </div>
                    )}

                    {viewMode === 'preconfigured' && (
                        <div>
                            <button onClick={() => setViewMode('selection')} className="mb-6 flex items-center text-gray-500 hover:text-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m15 18-6-6 6-6" /></svg>
                                Back to Selection
                            </button>
                            <section className="dashboard-grid grid grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="col-span-1 flex flex-col gap-4">
                                    {reportOptions.slice(0, 5).map(opt => (
                                        opt.route ? (
                                            <Link key={opt.id} to={opt.route} className="report-card">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="report-title">{opt.label}</div>
                                                        <div className="report-desc">{opt.desc}</div>
                                                    </div>
                                                    <DownloadCloud className="text-blue-600" />
                                                </div>
                                            </Link>
                                        ) : (
                                            <div key={opt.id} className="report-card">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="report-title">{opt.label}</div>
                                                        <div className="report-desc">{opt.desc}</div>
                                                    </div>
                                                    <DownloadCloud className="text-blue-600 opacity-50" />
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                                {/* Right Column */}
                                <div className="col-span-1 flex flex-col gap-4">
                                    {reportOptions.slice(5).map(opt => (
                                        opt.route ? (
                                            <Link key={opt.id} to={opt.route} className="report-card">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="report-title">{opt.label}</div>
                                                        <div className="report-desc">{opt.desc}</div>
                                                    </div>
                                                    <DownloadCloud className="text-blue-600" />
                                                </div>
                                            </Link>
                                        ) : (
                                            <div key={opt.id} className="report-card">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="report-title">{opt.label}</div>
                                                        <div className="report-desc">{opt.desc}</div>
                                                    </div>
                                                    <DownloadCloud className="text-blue-600 opacity-50" />
                                                </div>
                                            </div>
                                        )
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {viewMode === 'build' && (
                        <div>
                            <button onClick={() => setViewMode('selection')} className="mb-6 flex items-center text-gray-500 hover:text-gray-800">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="m15 18-6-6 6-6" /></svg>
                                Back to Selection
                            </button>
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
                                <h2 className="text-2xl font-bold mb-6 text-gray-800">Build Your Custom Report</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Data Source</label>
                                        <select
                                            value={selectedDataSource}
                                            onChange={(e) => setSelectedDataSource(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        >
                                            <option value="">-- Choose a report type --</option>
                                            {reportOptions.map(opt => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.label} {opt.route ? '' : '(Coming Soon)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                                        Only "Claims", "CEA", "Complaints", and "Connected Benefits" are currently supported for custom building.
                                    </div>

                                    <button
                                        onClick={handleBuildStart}
                                        disabled={!selectedDataSource}
                                        className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                                    >
                                        Start Building Report <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div >
            </main >
        </>
    );
};

export default Home;
