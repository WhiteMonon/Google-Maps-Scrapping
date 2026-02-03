import React, { useState, useEffect } from 'react';
import { api, type Lead } from '../api';
import { Download, RefreshCw, Database, ExternalLink } from 'lucide-react';

export const ResultsTable: React.FC = () => {
    const [results, setResults] = useState<Lead[]>([]);

    const fetchResults = async () => {
        const data = await api.getResults();
        setResults(data);
    };

    useEffect(() => {
        fetchResults();
        const interval = setInterval(fetchResults, 5000);
        return () => clearInterval(interval);
    }, []);

    const exportCSV = () => {
        if (results.length === 0) return;

        const headers = ["Name", "Address", "Phone", "Website", "Keyword"];
        const csvContent = [
            headers.join(","),
            ...results.map(row =>
                [row.name, row.address, row.phone, row.website, row.keyword]
                    .map(field => `"${(field || '').replace(/"/g, '""')}"`)
                    .join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Database size={18} className="text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">Results</h2>
                        <p className="text-xs text-gray-500">{results.length} leads collected</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchResults}
                        className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Refresh results"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={exportCSV}
                        disabled={results.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
                {results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                        <Database size={40} className="mb-3 opacity-50" />
                        <p className="text-sm">No results yet</p>
                        <p className="text-xs mt-1">Start scraping to collect leads</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50/95 backdrop-blur-sm sticky top-0 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Website</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {results.map((lead, i) => (
                                <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-5 py-3 font-medium text-sm text-gray-800">{lead.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{lead.phone}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {lead.website && lead.website !== 'N/A' ? (
                                            <a
                                                href={lead.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 hover:underline"
                                            >
                                                Visit <ExternalLink size={12} className="opacity-60" />
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={lead.address}>
                                        {lead.address || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
