import { useState, useCallback } from 'react';
import { KeywordManager } from './components/KeywordManager';
import { ControlPanel } from './components/ControlPanel';
import { LogViewer } from './components/LogViewer';
import { ResultsTable } from './components/ResultsTable';
import { KeywordProgress } from './components/KeywordProgress';
import { MapPin } from 'lucide-react';
import { api, type ScrapeStatus } from './api';

function App() {
  const [status, setStatus] = useState<ScrapeStatus>({ is_running: false, keywords: [], total_leads: 0 });

  const handleStatusChange = useCallback((newStatus: ScrapeStatus) => {
    setStatus(newStatus);
  }, []);

  const handleRetry = async (keyword: string) => {
    try {
      await api.retryKeyword(keyword);
    } catch (e) {
      console.error('Failed to retry keyword:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 text-gray-900 font-sans selection:bg-indigo-100 pb-12">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200/50">
            <MapPin size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              G-Maps Scraper
            </h1>
            <p className="text-xs text-gray-500 -mt-0.5">Dashboard</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Control Panel */}
        <section>
          <ControlPanel onStatusChange={handleStatusChange} />
        </section>

        {/* Progress Section */}
        {status.keywords.length > 0 && (
          <section>
            <KeywordProgress
              keywords={status.keywords}
              onRetry={handleRetry}
              isRunning={status.is_running}
            />
          </section>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
          {/* Left: Keywords */}
          <div className="lg:col-span-1">
            <KeywordManager />
          </div>

          {/* Right: Results & Logs */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex-1 min-h-[350px]">
              <ResultsTable />
            </div>
            <div className="h-56 shrink-0">
              <LogViewer />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
