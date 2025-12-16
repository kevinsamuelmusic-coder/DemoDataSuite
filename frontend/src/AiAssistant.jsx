import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { ArrowUp, ArrowDown, FileText, Download, Home as HomeResult, MessageSquare } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AiAssistant = () => {
    const [chartData, setChartData] = useState(null);
    const [trendData, setTrendData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalRecords, setTotalRecords] = useState(0);

    // Premium Color Palette from design
    const colors = [
        '#3b82f6', // Bright Blue
        '#4f46e5', // Indigo
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#06b6d4', // Cyan
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/monthly-stats');
                const data = await response.json();

                if (data.error || !data.months) {
                    setLoading(false);
                    return;
                }

                // 1. Process Main Bar Chart Data (Stacked)
                const labels = data.months.map(m => {
                    const date = new Date(m + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short' });
                });

                const datasets = Object.keys(data.data).map((type, index) => ({
                    label: type,
                    data: data.data[type],
                    backgroundColor: colors[index % colors.length],
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6,
                    borderSkipped: false
                }));

                setChartData({ labels, datasets });

                // 2. Process Trend Line Data (Totals per month)
                const totals = data.totals;
                setTotalRecords(totals.reduce((a, b) => a + b, 0));

                setTrendData({
                    labels: labels,
                    datasets: [{
                        label: 'Total Volume',
                        data: totals,
                        fill: true,
                        backgroundColor: (context) => {
                            const ctx = context.chart.ctx;
                            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // Blue start
                            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');   // Transparent end
                            return gradient;
                        },
                        borderColor: '#3b82f6',
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#4f46e5',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }]
                });

                setLoading(false);
            } catch (err) {
                console.error("Error fetching data:", err);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Configuration for Stacekd Bar Chart (Main)
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 11, family: 'Inter' }, padding: 15 }
            },
            tooltip: {
                backgroundColor: '#1f2937',
                padding: 12,
                cornerRadius: 8,
                titleFont: { size: 13 },
                callbacks: {
                    footer: (items) => {
                        const sum = items.reduce((a, b) => a + b.parsed.y, 0);
                        return `Total: ${sum}`;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                grid: { display: false },
                ticks: { color: '#9ca3af', font: { size: 12 } }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                border: { display: false },
                grid: { color: '#f3f4f6' },
                ticks: { color: '#9ca3af', font: { size: 11 } }
            }
        }
    };

    // Chat State
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');

    useEffect(() => {
        if (chartData && messages.length === 0) {
            // Initial Dummy Conversation
            setMessages([
                { id: 1, type: 'user', content: 'Hi, can you show me the monthly distribution statistics?' },
                { id: 2, type: 'ai', content: 'Hello! I can certainly help with that. Fetching the latest data for you...' },
                { id: 3, type: 'ai', content: 'Here is the monthly distribution chart based on the latest records:', isChart: true },
                { id: 4, type: 'user', content: 'Thanks! This looks good. Any significant trends?' },
                { id: 5, type: 'ai', content: 'Yes, there is a noticeable uptake in "Group Life" policies in August. Would you like a detailed report on that?' }
            ]);
        }
    }, [chartData]);


    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newMessage = {
            id: messages.length + 1,
            type: 'user',
            content: inputText
        };

        setMessages([...messages, newMessage]);
        setInputText('');

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: prev.length + 1,
                type: 'ai',
                content: "I'm a demo AI, but I understood: " + inputText
            }]);
        }, 1000);
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', opacity: 1, paddingLeft: '0px' }}>
                        <div className="active" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <MessageSquare size={20} />
                            <span>AI Assistant</span>
                        </div>
                    </div>
                </nav>
            </aside>

            {/* Main Chat Area - Gemini Style */}
            <main className="main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#ffffff', position: 'relative' }}>

                {/* Minimal Header */}
                <header className="px-6 py-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg text-slate-700">MetLife Model</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">AI Assistant 1.0</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Online
                    </div>
                </header>

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto px-4 py-8">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>

                                {/* AI Avatar */}
                                {msg.type === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white shadow-sm shrink-0">
                                        <div className="text-[10px] font-bold">AI</div>
                                    </div>
                                )}

                                {/* Message Content */}
                                <div className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>

                                    {/* User Name / Time (Optional) */}
                                    <div className="text-xs text-slate-400 mb-1 px-1">
                                        {msg.type === 'user' ? 'You' : 'MetLife AI'}
                                    </div>

                                    {/* Bubble / Text */}
                                    <div className={`text-[15px] leading-7 ${msg.type === 'user'
                                        ? 'bg-blue-600 text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm'
                                        : 'text-slate-800' // AI - No bubble, just text
                                        }`}>
                                        {msg.isChart ? (
                                            <div className="bg-white border rounded-xl p-4 shadow-sm mt-2 w-[600px] h-[350px]">
                                                {chartData ? <Bar data={chartData} options={barOptions} /> : <div className="h-full flex items-center justify-center text-slate-400">Loading Chart...</div>}
                                            </div>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {messages.length === 0 && loading && (
                            <div className="text-center text-slate-400 mt-20">
                                <p>Initializing AI Context...</p>
                            </div>
                        )}
                        {/* Spacer for bottom input */}
                        <div className="h-32"></div>
                    </div>
                </div>

                {/* Floating Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={handleSendMessage} className="relative shadow-lg rounded-2xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-shadow">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Message MetLife AI..."
                                className="w-full pl-5 pr-14 py-4 bg-transparent border-none focus:outline-none text-slate-700 placeholder-slate-400"
                            />
                            <button
                                type="submit"
                                className={`absolute right-2 top-2 p-2 rounded-xl transition-all ${inputText.trim()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    }`}
                                disabled={!inputText.trim()}
                            >
                                <ArrowUp size={20} />
                            </button>
                        </form>
                        <div className="text-center mt-3">
                            <p className="text-xs text-slate-400">AI can make mistakes. Check important info.</p>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default AiAssistant;
