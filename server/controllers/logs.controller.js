const ActivityLog = require('../models/ActivityLog');

/**
 * LogsController - Handles activity log retrieval and management
 */
class LogsController {
  /**
   * GET /api/logs - Get activity logs with pagination
   */
  async getLogs(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const {
        type = null,
        limit = 100,
        skip = 0,
        startDate = null,
        endDate = null
      } = req.query;

      const logs = await ActivityLog.getUserLogs(userId, {
        type,
        limit: parseInt(limit) || 100,
        skip: parseInt(skip) || 0,
        startDate,
        endDate
      });

      res.json({
        success: true,
        logs,
        count: logs.length
      });
    } catch (error) {
      console.error('Error getting logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve logs'
      });
    }
  }

  /**
   * GET /api/logs/export - Export logs as JSON
   */
  async exportLogs(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const {
        type = null,
        startDate = null,
        endDate = null
      } = req.query;

      const logs = await ActivityLog.getUserLogs(userId, {
        type,
        limit: 10000, // Export more logs
        skip: 0,
        startDate,
        endDate
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${Date.now()}.json"`);
      res.json(logs);
    } catch (error) {
      console.error('Error exporting logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export logs'
      });
    }
  }

  /**
   * DELETE /api/logs - Clear logs (admin only or clear user's own logs)
   */
  async clearLogs(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Delete all logs for this user
      const result = await ActivityLog.deleteMany({ userId });

      res.json({
        success: true,
        message: `Cleared ${result.deletedCount} log entries`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear logs'
      });
    }
  }

  /**
   * DELETE /api/logs/:logId - Delete a single log entry
   */
  async deleteLog(req, res) {
    try {
      const userId = req.userId || req.user?._id;
      const { logId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!logId) {
        return res.status(400).json({
          success: false,
          error: 'Log ID is required'
        });
      }

      const result = await ActivityLog.deleteOne({ _id: logId, userId });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Log entry not found'
        });
      }

      res.json({
        success: true,
        message: 'Log entry deleted successfully',
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error deleting log entry:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete log entry'
      });
    }
  }
}

module.exports = LogsController;
