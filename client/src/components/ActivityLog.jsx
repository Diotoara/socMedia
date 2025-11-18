import { useState, useEffect, useCallback } from 'react';
import { logsAPI } from '../utils/api';
import { useApp } from '../context/AppContext';

const ActivityLog = ({ isAutomationActive }) => {
  const { toast } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalLogs: 0,
    limit: 50
  });
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: ''
  });

  // Fetch logs from API
  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    
    try {
      const params = {
        page,
        limit: pagination.limit
      };

      // Add filters if set
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await logsAPI.getLogs(params);
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setPagination({
          currentPage: response.data.currentPage,
          totalPages: response.data.totalPages,
          totalLogs: response.data.totalLogs,
          limit: pagination.limit
        });
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
      toast.showError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, toast]);

  const handleDeleteLog = useCallback(async (logId) => {
    if (!logId) return;
    const confirmed = window.confirm('Are you sure you want to delete this log entry?');
    if (!confirmed) return;

    try {
      setDeletingLogId(logId);
      await logsAPI.deleteLog(logId);
      setLogs(prev => prev.filter(log => (log._id || log.id) !== logId));
      toast.showSuccess('Log deleted successfully');
    } catch (err) {
      console.error('Error deleting log:', err);
      toast.showError('Failed to delete log');
    } finally {
      setDeletingLogId(null);
    }
  }, [toast]);

  // Initial fetch on component mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh logs every 10 seconds when automation is active
  useEffect(() => {
    let interval;
    if (isAutomationActive) {
      interval = setInterval(() => {
        fetchLogs(pagination.currentPage);
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutomationActive, pagination.currentPage, fetchLogs]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchLogs(1); // Reset to first page when applying filters
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      type: '',
      startDate: '',
      endDate: ''
    });
    // Fetch logs without filters
    setTimeout(() => fetchLogs(1), 0);
  };

  // Handle pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchLogs(page);
    }
  };

  // Export logs as JSON
  const handleExport = async () => {
    try {
      const response = await logsAPI.exportLogs();
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `instagram-automation-logs-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.showSuccess('Logs exported successfully');
    } catch (err) {
      console.error('Error exporting logs:', err);
      toast.showError('Failed to export logs');
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get badge color based on log type
  const getLogTypeBadge = (type) => {
    const badges = {
      comment_detected: 'bg-blue-100 text-blue-800 border-blue-200',
      reply_generated: 'bg-purple-100 text-purple-800 border-purple-200',
      reply_posted: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return badges[type] || badges.info;
  };

  // Get icon for log type
  const getLogTypeIcon = (type) => {
    switch (type) {
      case 'comment_detected':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'reply_generated':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'reply_posted':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export</span>
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="comment_detected">Comment Detected</option>
              <option value="reply_generated">Reply Generated</option>
              <option value="reply_posted">Reply Posted</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500">No logs found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => {
                const logId = log._id || log.id;
                return (
                <tr key={logId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getLogTypeBadge(log.type)}`}>
                      {getLogTypeIcon(log.type)}
                      <span className="ml-1">{log.type.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-2xl">
                      {log.message}
                      {log.details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-xs">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleDeleteLog(logId)}
                      disabled={deletingLogId === logId}
                      className="inline-flex items-center px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v2M4 7h16" />
                      </svg>
                      {deletingLogId === logId ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-700">
            Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalLogs} total logs)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => goToPage(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {[...Array(Math.min(5, pagination.totalPages))].map((_, idx) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = idx + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + idx;
                } else {
                  pageNum = pagination.currentPage - 2 + idx;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
                      pagination.currentPage === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => goToPage(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {isAutomationActive && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">🔄 Auto-refresh enabled:</span> Logs will refresh every 10 seconds while automation is active.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
