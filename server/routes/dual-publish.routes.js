const express = require('express');
const router = express.Router();

/**
 * Dual Publishing Routes
 * Requires controller to be initialized with Socket.IO instance
 */
function createDualPublishRoutes(controller) {
  // Start publishing job
  router.post('/dual', controller.upload.single('video'), (req, res) => {
    controller.startPublishJob(req, res);
  });

  // Get job status
  router.get('/dual/:jobId', (req, res) => {
    controller.getJobStatus(req, res);
  });

  // Get user's jobs
  router.get('/dual/jobs', (req, res) => {
    controller.getUserJobs(req, res);
  });

  return router;
}

module.exports = createDualPublishRoutes;
