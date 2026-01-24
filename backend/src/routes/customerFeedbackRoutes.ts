import express from 'express';
import customerFeedbackService from '../services/customerFeedbackService';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Get all feedbacks
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = {
      trangThaiXuLy: req.query.trangThaiXuLy as string,
      loaiPhanHoi: req.query.loaiPhanHoi as string,
      mucDoNghiemTrong: req.query.mucDoNghiemTrong as string,
      search: req.query.search as string,
      customerType: req.query.customerType as string,
    };

    const feedbacks = await customerFeedbackService.getAllFeedbacks(filters);
    res.json({
      success: true,
      data: feedbacks,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get statistics (must be before /:id route)
router.get('/statistics/summary', authenticate, async (_req, res) => {
  try {
    const stats = await customerFeedbackService.getStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get feedback by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.getFeedbackById(req.params.id as string);
    res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create new feedback
router.post('/', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.createFeedback(req.body);
    res.status(201).json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update feedback
router.put('/:id', authenticate, async (req, res) => {
  try {
    const feedback = await customerFeedbackService.updateFeedback(req.params.id as string, req.body);
    res.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete feedback
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await customerFeedbackService.deleteFeedback(req.params.id as string);
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
});

export default router;

