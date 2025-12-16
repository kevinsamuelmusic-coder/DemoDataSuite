import React, { useState, useEffect, useRef } from 'react';

const ExportManager = () => {
    const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, FAILURE
    const [jobId, setJobId] = useState(null);
    const [message, setMessage] = useState('');
    const pollInterval = useRef(null);

    const startExport = async () => {
        try {
            setStatus('PROCESSING');
            setMessage('Initiating export...');

            const response = await fetch('/api/export/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: {} }), // Send any needed filters
            });

            const data = await response.json();

            if (response.status === 202) {
                setJobId(data.job_id);
                setMessage('Export started. Processing...');
                // Start polling
                pollInterval.current = setInterval(() => checkStatus(data.job_id), 2000);
            } else {
                setStatus('FAILURE');
                setMessage('Failed to start export.');
            }
        } catch (error) {
            console.error('Error starting export:', error);
            setStatus('FAILURE');
            setMessage('Network error while starting export.');
        }
    };

    const checkStatus = async (id) => {
        try {
            const response = await fetch(`/api/export/status/${id}`);
            const data = await response.json();

            if (data.state === 'SUCCESS') {
                clearInterval(pollInterval.current);
                setStatus('SUCCESS');
                setMessage('Export complete! Downloading now...');
                // Trigger download
                window.location.href = data.download_url;
            } else if (data.state === 'FAILURE') {
                clearInterval(pollInterval.current);
                setStatus('FAILURE');
                setMessage(`Export failed: ${data.error}`);
            } else {
                // Still PENDING or STARTED
                setMessage(`Processing... ${data.result?.current_row ? `(${data.result.current_row} rows)` : ''}`);
            }
        } catch (error) {
            console.error('Error checking status:', error);
            // Don't stop polling on transient network errors, maybe?
            // For now, we continue polling.
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-10">
            <h2 className="text-xl font-bold mb-4">Data Export</h2>

            <div className="mb-4">
                <p className="text-gray-600 mb-2">
                    Exporting large datasets (15M+ rows) may take several minutes.
                    We will process this in the background and download it automatically when ready.
                </p>

                {status === 'IDLE' && (
                    <button
                        onClick={startExport}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                    >
                        Start Export
                    </button>
                )}

                {status === 'PROCESSING' && (
                    <div className="text-center">
                        <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full border-blue-600 border-t-transparent mb-2"></div>
                        <p className="text-blue-600 font-medium">{message}</p>
                    </div>
                )}

                {status === 'SUCCESS' && (
                    <div className="text-center">
                        <div className="text-green-500 text-4xl mb-2">✓</div>
                        <p className="text-green-600 font-bold">Export Complete</p>
                        <p className="text-sm text-gray-500">Your download should start automatically.</p>
                        <button
                            onClick={() => setStatus('IDLE')}
                            className="mt-4 text-sm text-blue-500 underline"
                        >
                            Start New Export
                        </button>
                    </div>
                )}

                {status === 'FAILURE' && (
                    <div className="text-center">
                        <div className="text-red-500 text-4xl mb-2">✗</div>
                        <p className="text-red-600 font-bold">Error</p>
                        <p className="text-sm text-red-500">{message}</p>
                        <button
                            onClick={startExport}
                            className="mt-4 bg-gray-200 text-gray-800 py-1 px-3 rounded hover:bg-gray-300"
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportManager;
