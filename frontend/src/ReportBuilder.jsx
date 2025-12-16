import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, X, Home as HomeResult, MessageSquare, Activity, Settings, Lock } from 'lucide-react';

const ReportBuilder = ({ reportType, title }) => {
    const location = useLocation();
    const isCustomMode = location.state?.custom;

    // Keep internal state for columns but don't show UI
    const [allColumns, setAllColumns] = useState([]);
    const [selectedColumns, setSelectedColumns] = useState(new Set());
    // New state for Categories (Complaints) or Policy Types (CEA)
    const [allCategories, setAllCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(new Set());

    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [previewData, setPreviewData] = useState(null); // Null initially indicates no report created
    const [loading, setLoading] = useState(false);

    // Initialize dates and columns (dummy data)
    useEffect(() => {
        const init = async () => {
            // Mock Dates
            const initialDates = {
                from: '2023-01-01',
                to: '2023-12-31'
            };
            setDateRange(initialDates);

            // Mock Columns
            const cols = ['Policy Number', 'Status', 'Product Type', 'Issue Date', 'Premium Amount', 'Customer Name', 'Agent Name'];
            setAllColumns(cols);
            setSelectedColumns(new Set(cols));

            // Mock Categories
            if (reportType === 'complaints' || reportType === 'cea') {
                const cats = ['Service', 'Billing', 'Product', 'Claims', 'Enrollment'];
                setAllCategories(cats);
                setSelectedCategories(new Set(cats));
            }
        };
        init();
    }, [reportType]);

    const handleDateChange = (e) => {
        const { id, value } = e.target;
        let newRange = { ...dateRange };
        if (id === 'fromDate') {
            newRange.from = value;
        } else {
            newRange.to = value;
        }
        setDateRange(newRange);
    };

    const handleCreateReport = async () => {
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
            const mockRows = [];
            const colsToUse = Array.from(selectedColumns);
            for (let i = 0; i < 20; i++) {
                let row = {};
                colsToUse.forEach(col => {
                    if (col === 'Policy Number') row[col] = 'POL-' + Math.floor(Math.random() * 100000);
                    else if (col === 'Status') row[col] = Math.random() > 0.5 ? 'Active' : 'Inactive';
                    else if (col === 'Product Type') row[col] = ['Product 1', 'Product 2', 'Product 3'][Math.floor(Math.random() * 3)];
                    else if (col === 'Issue Date') row[col] = '2023-' + Math.floor(Math.random() * 12 + 1) + '-' + Math.floor(Math.random() * 28 + 1);
                    else if (col === 'Premium Amount') row[col] = '$' + (Math.random() * 500).toFixed(2);
                    else if (col === 'Customer Name') row[col] = 'Customer ' + (i + 1);
                    else row[col] = 'Data ' + (i + 1);
                });
                mockRows.push(row);
            }

            setPreviewData({
                rows: mockRows,
                columns: colsToUse
            });
            setLoading(false);
        }, 1500);
    };

    const handleExport = (format = 'csv') => {
        alert("This is a demo. Export functionality is simulated.");
    };

    return (
        <>
            <aside className="sidebar">
                <div className="logo" style={{ marginBottom: '40px', paddingLeft: '8px' }}>
                    <img src="/demo_logo.png" alt="Demo Report" style={{ height: '40px', objectFit: 'contain' }} />
                </div>
                <nav className="nav">

                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.7 }}>
                        <HomeResult size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 0.7 }} onClick={() => alert('Contact clicked')}>
                        <MessageSquare size={20} />
                        <span>Contact</span>
                    </a>
                </nav>
                {/* Active state for Build Reports if currently on this page? Optional */}

            </aside >

            {/* Cube Loader Overlay */}
            {
                loading && (
                    <div className="loading-overlay">
                        <div className="cube-loader">
                            <div className="cube cube1"></div>
                            <div className="cube cube2"></div>
                            <div className="cube cube3"></div>
                            <div className="cube cube4"></div>
                            <div className="cube cube5"></div>
                            <div className="cube cube6"></div>
                            <div className="cube cube7"></div>
                            <div className="cube cube8"></div>
                            <div className="cube cube9"></div>
                        </div>
                    </div>
                )
            }

            <main className="main">
                <div id="claimsReportBuilder">
                    <header className="header">
                        <div className="title-group">
                            <div className="title">{title}</div>
                            <div className="subtitle">Select date range and product to generate your report.</div>
                        </div>
                        <Link to="/" className="back-btn">
                            <ArrowLeft size={16} /> Back to Reports
                        </Link>
                    </header>

                    {/* Full Width Layout */}
                    <div style={{ width: '100%', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Controls Card */}
                        <div className="card" style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '24px' }}>

                                {/* Date Range */}
                                <div>
                                    <div className="group-title" style={{ marginBottom: '16px' }}>Date Range</div>
                                    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>From</label>
                                            <input
                                                type="date"
                                                id="fromDate"
                                                value={dateRange.from}
                                                onChange={handleDateChange}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '6px' }}>To</label>
                                            <input
                                                type="date"
                                                id="toDate"
                                                value={dateRange.to}
                                                onChange={handleDateChange}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Column Selection - Only in Custom Mode */}
                                {isCustomMode && (
                                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                        <div className="group-title" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Select Columns</span>
                                            <div>
                                                <button
                                                    onClick={() => setSelectedColumns(new Set(allColumns))}
                                                    style={{ fontSize: '12px', color: '#007bff', background: 'none', border: 'none', cursor: 'pointer', marginRight: '16px' }}
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    onClick={() => setSelectedColumns(new Set())}
                                                    style={{ fontSize: '12px', color: '#666', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        </div>
                                        <div className="checkbox-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '16px', borderRadius: '8px' }}>
                                            {allColumns.length === 0 ? (
                                                <div style={{ color: '#888', fontStyle: 'italic' }}>Loading columns...</div>
                                            ) : (
                                                allColumns.map(col => (
                                                    <label key={col} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedColumns.has(col)}
                                                            onChange={(e) => {
                                                                const newSet = new Set(selectedColumns);
                                                                if (e.target.checked) {
                                                                    newSet.add(col);
                                                                } else {
                                                                    newSet.delete(col);
                                                                }
                                                                setSelectedColumns(newSet);
                                                            }}
                                                        />
                                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', title: col }}>{col}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Category/Policy Selection */}
                                {(reportType === 'complaints' || reportType === 'cea') && (
                                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                                        <div className="group-title" style={{ marginBottom: '16px' }}>
                                            {reportType === 'cea' ? 'Select Policy Type' : 'Select Product Type'}
                                        </div>
                                        <div className="checkbox-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', height: 'auto' }}>
                                            {allCategories.length === 0 ? (
                                                <div style={{ color: '#888', fontStyle: 'italic' }}>Loading options...</div>
                                            ) : (
                                                allCategories.map(cat => (
                                                    <label key={cat} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedCategories.has(cat)}
                                                            onChange={(e) => {
                                                                const newSet = new Set(selectedCategories);
                                                                if (e.target.checked) {
                                                                    newSet.add(cat);
                                                                } else {
                                                                    newSet.delete(cat);
                                                                }
                                                                setSelectedCategories(newSet);
                                                            }}
                                                        />
                                                        {cat}
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Product Selection (Only for Claims) */}
                                {reportType === 'claims' && (
                                    <div>
                                        <div className="group-title" style={{ marginBottom: '16px' }}>Select Product</div>
                                        <div className="checkbox-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', height: 'auto' }}>
                                            <label><input type="checkbox" defaultChecked /> Product 1</label>
                                            <label><input type="checkbox" defaultChecked /> Product 2</label>
                                            <label><input type="checkbox" defaultChecked /> Product 3</label>
                                            <label><input type="checkbox" defaultChecked /> Product 4</label>
                                            <label><input type="checkbox" defaultChecked /> Product 5</label>
                                            <label><input type="checkbox" defaultChecked /> Product 6</label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Create Button */}
                            <div style={{ textAlign: 'right', marginTop: '16px' }}>
                                <button
                                    className="build-btn"
                                    style={{ width: 'auto', padding: '12px 32px', fontSize: '16px' }}
                                    onClick={handleCreateReport}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create Report'}
                                </button>
                            </div>
                        </div>

                        {/* Preview Section (Only shows after Create Report is clicked) */}
                        {previewData && (
                            <div className="preview card" style={{ animation: 'fadeIn 0.5s ease' }}>
                                <div style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '18px' }}>Report Preview</span>
                                </div>

                                <div className="table-wrap" style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '24px', border: '1px solid #eee', borderRadius: '4px' }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                {/* SHOW TOP 7 COLUMNS */}
                                                {previewData.columns.slice(0, 7).map(col => (
                                                    <th key={col}>{col}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.rows.length === 0 ? (
                                                <tr><td colSpan={Math.max(1, previewData.columns.slice(0, 7).length) || 1} style={{ textAlign: 'center', padding: '40px', color: '#777' }}>No data found for this selection.</td></tr>
                                            ) : (
                                                previewData.rows.map((row, idx) => (
                                                    <tr key={idx}>
                                                        {/* SHOW TOP 7 COLUMNS */}
                                                        {previewData.columns.slice(0, 7).map(col => (
                                                            <td key={col}>{row[col]}</td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                                    <p style={{ fontSize: '13px', color: '#666' }}>Showing top 5 rows with 7 columns preview.</p>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="export-btn" style={{ width: 'auto', fontSize: '14px', padding: '10px 20px', backgroundColor: '#007bff', color: '#fff' }} onClick={() => handleExport('xlsx')}>
                                            Analyze
                                        </button>
                                        <button className="export-btn" style={{ width: 'auto', fontSize: '14px', padding: '10px 20px', backgroundColor: '#217346', color: '#fff' }} onClick={() => handleExport('xlsx')}>
                                            Export Excel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </>
    );
};

export default ReportBuilder;
