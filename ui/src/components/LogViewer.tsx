import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';

export const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let retryTimeout: ReturnType<typeof setTimeout>;

        const connect = () => {
            // Determine WebSocket URL dynamically
            let baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:7860`;

            // Normalize URL to have protocol
            if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
                const protocol = baseUrl.includes('localhost') ? 'http' : 'https';
                baseUrl = `${protocol}://${baseUrl}`;
            }

            // Determine correct WS protocol
            // If page is loaded over HTTPS, we MUST use WSS to avoid Mixed Content errors
            const isSecureContext = window.location.protocol === 'https:';
            const wsProtocol = isSecureContext || baseUrl.startsWith('https') ? 'wss' : 'ws';

            // Clean host
            const wsHost = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            ws = new WebSocket(`${wsProtocol}://${wsHost}/ws/logs`);

            ws.onopen = () => {
                console.log('Connected to logs WebSocket');
                setLogs(prev => [...prev, "✓ Connected to log stream"]);
            };

            ws.onmessage = (event) => {
                setLogs(prev => [...prev.slice(-500), event.data]);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setLogs(prev => [...prev.slice(-500), "⚠ Connection error. Retrying..."]);
            };

            ws.onclose = () => {
                console.log('WebSocket closed. Retrying in 3s...');
                retryTimeout = setTimeout(connect, 3000);
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            clearTimeout(retryTimeout);
        };
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getLogStyle = (log: string) => {
        if (log.includes('ERROR') || log.includes('Failed') || log.includes('⚠')) {
            return 'text-red-400';
        }
        if (log.includes('Starting') || log.includes('✓')) {
            return 'text-emerald-400';
        }
        if (log.includes('Extracted')) {
            return 'text-blue-400';
        }
        return 'text-gray-300';
    };

    return (
        <div className="bg-[#0f0f0f] rounded-2xl shadow-lg border border-gray-800/50 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800/80 flex items-center gap-2.5 bg-[#161616]">
                <Terminal size={16} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Logs</span>
                <span className="text-xs text-gray-600 ml-auto">{logs.length} entries</span>
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto logs-scroll p-4 font-mono text-xs leading-relaxed">
                {logs.length === 0 ? (
                    <div className="text-gray-600 text-center py-8">
                        Waiting for log events...
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`py-0.5 ${getLogStyle(log)}`}>
                            <span className="text-gray-600 mr-2 select-none">›</span>
                            {log}
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};
