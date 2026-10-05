import { Router } from 'express';
import repairRequestController from '@controllers/repairRequestController';
import { authenticate } from '@middlewares/auth';
import { requireRule } from '@middlewares/requireRule';
import { requireTechnical, denyEmployeeDelete } from '@middlewares/technicalAccess';
import { createSingleUploadMiddleware } from '@middlewares/upload';
import { zodValidate } from '@middlewares/zodValidation';
import { repairActualFieldsSchema } from '@schemas';
const router = Router();

const uploadRepairRequest = createSingleUploadMiddleware('repair-requests');
const uploadIncidental = createSingleUploadMiddleware('repair-incidental-costs');

// Public authenticated routes (read)
router.get('/', authenticate, repairRequestController.getAllRepairRequests);
router.get('/export/excel', authenticate, repairRequestController.exportToExcel);
router.get('/generate-code', authenticate, repairRequestController.generateCode);
router.get('/stats', authenticate, repairRequestController.getStats.bind(repairRequestController));
router.get('/:id/status-history', authenticate, repairRequestController.getStatusHistory);
router.get('/:id/supply-chain', authenticate, repairRequestController.getSupplyChain);
router.get('/:id/cost-summary', authenticate, repairRequestController.getCostSummary);
router.get('/:id/assignees', authenticate, repairRequestController.listAssignees);
router.get('/:id/material-needs', authenticate, repairRequestController.listMaterialNeeds);
router.get('/:id/supply-links', authenticate, repairRequestController.listSupplyLinks);
router.get('/:id', authenticate, repairRequestController.getRepairRequestById);

// Mutations — require rule
router.post('/', authenticate, requireRule('repair-requests', 'CREATE'), uploadRepairRequest, repairRequestController.createRepairRequest);
router.put('/:id', authenticate, requireRule('repair-requests', 'UPDATE'), uploadRepairRequest, repairRequestController.updateRepairRequest);
router.delete('/:id', authenticate, requireRule('repair-requests', 'DELETE'), denyEmployeeDelete, repairRequestController.deleteRepairRequest);

// Status transitions (design 4.1)
router.patch('/:id/accept', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.accept);
router.patch('/:id/plan', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.plan);
router.patch('/:id/start', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.startRepair);
router.post('/:id/start-repair', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.startRepair);
router.patch('/:id/submit-acceptance', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.submitAcceptance);
// Requester (often outside Kỹ thuật) confirms — authorization = designated confirmer, enforced in service
router.patch('/:id/confirm-acceptance', authenticate, repairRequestController.confirmAcceptance);
router.patch('/:id/reject', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.reject);
router.patch('/:id/cancel', authenticate, requireRule('repair-requests', 'UPDATE'), repairRequestController.cancel);
router.post('/:id/cancel', authenticate, requireRule('repair-requests', 'UPDATE'), repairRequestController.cancel);
router.patch('/:id/complete', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.complete);
// Actual cost / hours / content — technicians only, DA_NGHIEM_THU | HOAN_THANH (service guard)
router.patch('/:id/actual-fields', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, zodValidate(repairActualFieldsSchema), repairRequestController.updateActualFields);

// Assignees
router.post('/:id/assignees', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.addAssignee);
router.delete('/:id/assignees/:assigneeId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.removeAssignee);

// Material needs
router.post('/:id/material-needs', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.addMaterialNeed);
router.put('/:id/material-needs/:needId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.updateMaterialNeed);
router.delete('/:id/material-needs/:needId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.removeMaterialNeed);

// Supply links
router.post('/:id/supply-links', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.addSupplyLink);
router.delete('/:id/supply-links/:linkId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.removeSupplyLink);

// Incidental costs
router.get('/:id/incidental-costs', authenticate, repairRequestController.listIncidentalCosts);
router.post('/:id/incidental-costs', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, uploadIncidental, repairRequestController.createIncidentalCost);
router.put('/:id/incidental-costs/:costId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, uploadIncidental, repairRequestController.updateIncidentalCost);
router.delete('/:id/incidental-costs/:costId', authenticate, requireRule('repair-requests', 'UPDATE'), requireTechnical, repairRequestController.deleteIncidentalCost);

export default router;
