import { useState, useEffect } from 'react';
import { api, type ScrapeStatus } from '../api';
import { Play, Square, Activity, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    onStatusChange?: (status: ScrapeStatus) => void;
}

export const ControlPanel = ({ onStatusChange }: Props) => {
    const [status, setStatus] = useState<ScrapeStatus>({ is_running: false, keywords: [], total_leads: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const s = await api.getStatus();
                setStatus(s);
                onStatusChange?.(s);
            } catch (e) {
                console.error('Failed to get status:', e);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [onStatusChange]);

    const toggleScrape = async () => {
        setLoading(true);
        try {
            if (status.is_running) {
                await api.stopScraping();
            } else {
                await api.startScraping();
            }
        } finally {
            setLoading(false);
        }
    };

    const runningKeyword = status.keywords.find(k => k.status === 'running');
    const completedCount = status.keywords.filter(k => k.status === 'done').length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            <div className="px-6 py-5 flex items-center justify-between">
                {/* Left: Status Info */}
                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "p-3 rounded-xl transition-all",
                        status.is_running
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-gray-100 text-gray-400"
                    )}>
                        <Activity size={22} className={status.is_running ? "animate-pulse" : ""} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Scraper Status</h2>
                        <p className="text-sm text-gray-500">
                            {status.is_running
                                ? runningKeyword
                                    ? `Processing: ${runningKeyword.keyword}`
                                    : 'Initializing...'
                                : completedCount > 0
                                    ? `Completed ${completedCount} keywords`
                                    : 'Ready to start'}
                        </p>
                    </div>
                </div>

                {/* Right: Stats & Control */}
                <div className="flex items-center gap-6">
                    {/* Leads Counter */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                        <TrendingUp size={18} className="text-indigo-500" />
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-800 tabular-nums">{status.total_leads}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Leads</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={toggleScrape}
                        disabled={loading}
                        className={clsx(
                            "flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg",
                            status.is_running
                                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-200"
                                : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-200"
                        )}
                    >
                        {status.is_running ? (
                            <>
                                <Square size={18} fill="currentColor" />
                                Stop
                            </>
                        ) : (
                            <>
                                <Play size={18} fill="currentColor" />
                                Start Scraping
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
