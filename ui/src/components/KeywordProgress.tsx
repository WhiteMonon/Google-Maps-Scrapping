import { type KeywordProgress as KeywordProgressType } from '../api';
import { RefreshCw, Check, X, Clock, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    keywords: KeywordProgressType[];
    onRetry: (keyword: string) => void;
    isRunning: boolean;
}

export const KeywordProgress = ({ keywords, onRetry, isRunning }: Props) => {
    if (keywords.length === 0) {
        return null;
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { icon: JSX.Element; badge: string; bar: string }> = {
            pending: {
                icon: <Clock size={14} className="text-gray-400" />,
                badge: 'bg-gray-100 text-gray-600 border-gray-200',
                bar: 'bg-gray-300'
            },
            running: {
                icon: <Loader2 size={14} className="text-blue-500 animate-spin" />,
                badge: 'bg-blue-50 text-blue-600 border-blue-200',
                bar: 'bg-blue-500'
            },
            done: {
                icon: <Check size={14} className="text-emerald-500" />,
                badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                bar: 'bg-emerald-500'
            },
            failed: {
                icon: <X size={14} className="text-red-500" />,
                badge: 'bg-red-50 text-red-600 border-red-200',
                bar: 'bg-red-500'
            },
            cancelled: {
                icon: <X size={14} className="text-orange-500" />,
                badge: 'bg-orange-50 text-orange-600 border-orange-200',
                bar: 'bg-orange-500'
            }
        };
        return configs[status] || configs.pending;
    };

    // Calculate summary stats
    const completed = keywords.filter(k => k.status === 'done').length;
    const total = keywords.length;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-gray-800">Scraping Progress</h2>
                    <p className="text-xs text-gray-500">{completed} of {total} keywords completed</p>
                </div>
                {isRunning && (
                    <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-200">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        In Progress
                    </span>
                )}
            </div>

            {/* Progress Items */}
            <div className="divide-y divide-gray-100">
                {keywords.map((kw) => {
                    const config = getStatusConfig(kw.status);
                    return (
                        <div
                            key={kw.keyword}
                            className={clsx(
                                "px-5 py-4 transition-all",
                                kw.status === 'running' && 'bg-blue-50/30'
                            )}
                        >
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex-shrink-0">{config.icon}</div>
                                    <span className="font-medium text-sm text-gray-800 truncate" title={kw.keyword}>
                                        {kw.keyword}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-md text-xs font-medium border capitalize",
                                        config.badge
                                    )}>
                                        {kw.status}
                                    </span>
                                    {kw.status === 'failed' && !isRunning && (
                                        <button
                                            onClick={() => onRetry(kw.keyword)}
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-sm"
                                        >
                                            <RefreshCw size={12} />
                                            Retry
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={clsx(
                                            "h-full rounded-full transition-all duration-500",
                                            config.bar,
                                            kw.status === 'running' && 'animate-pulse'
                                        )}
                                        style={{ width: `${Math.min(kw.progress, 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500 font-mono tabular-nums min-w-[60px] text-right">
                                    {kw.current}/{kw.limit}
                                </span>
                            </div>

                            {/* Error Message */}
                            {kw.error && (
                                <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                                    {kw.error}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
