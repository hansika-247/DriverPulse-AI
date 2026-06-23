import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiGetFeedbackStats } from '../api';

const FeedbackLearning = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // apiGetFeedbackStats uses the shared nodeClient which automatically
        // reads the correct 'dp_token' key from localStorage
        const res = await apiGetFeedbackStats(true);
        // res is already res.data (the interceptor unwraps it)
        setStats(res.data.stats);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching feedback stats:', err);
        setError('Failed to load feedback metrics.');
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl font-medium text-gray-500 dark:text-gray-400">Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl font-medium text-red-500">{error}</div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Retrieval Accuracy',
      value: `${stats.retrievalAccuracy}%`,
      icon: <Target className="h-6 w-6 text-indigo-600" />,
      color: 'bg-indigo-100',
    },
    {
      title: 'Correct Feedback',
      value: `${stats.correct}%`,
      icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
      color: 'bg-emerald-100',
    },
    {
      title: 'Incorrect Feedback',
      value: `${stats.incorrect}%`,
      icon: <XCircle className="h-6 w-6 text-rose-600" />,
      color: 'bg-rose-100',
    },
    {
      title: 'Total Feedback',
      value: stats.total,
      icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback Learning Pipeline</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor the human-in-the-loop performance of the AI Assistant and RAG pipeline.
          </p>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, idx) => (
            <div
              key={idx}
              className="flex items-center overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5 transition hover:shadow-md dark:bg-gray-800 dark:ring-white/10"
            >
              <div className={`mr-5 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.title}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Details Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Corrected Events */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10">
            <div className="mb-4 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Corrected Events</h2>
            </div>
            
            {stats.topCorrectedEvents && stats.topCorrectedEvents.length > 0 ? (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.topCorrectedEvents.map((evt, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <span className="font-medium text-gray-700 capitalize dark:text-gray-300">
                      {evt.type.replace(/_/g, ' ')}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {evt.count} feedback{evt.count !== 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No feedback data available yet.</p>
            )}
          </div>

          {/* Explanation Panel */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 p-6 shadow-sm ring-1 ring-gray-900/5 dark:from-gray-800 dark:to-gray-800 dark:ring-white/10">
            <h2 className="mb-4 text-lg font-bold text-indigo-900 dark:text-indigo-300">How Learning Works</h2>
            <div className="space-y-4 text-indigo-800 dark:text-indigo-200">
              <p>
                <strong>Weight Boosting:</strong> When a driver marks a flag as <span className="font-semibold text-emerald-600 dark:text-emerald-400">Correct</span>, its priority is increased during AI retrieval. The AI learns to reference these accurate events more frequently.
              </p>
              <p>
                <strong>Weight Penalising:</strong> Flags marked as <span className="font-semibold text-rose-600 dark:text-rose-400">Incorrect</span> receive a penalty. They are pushed further down the retrieval list, ensuring the AI relies on them less.
              </p>
              <p>
                <strong>Exclusion:</strong> Flags marked as <span className="font-semibold text-gray-600 dark:text-gray-400">Not Relevant</span> are dropped from the context window entirely before generation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackLearning;
