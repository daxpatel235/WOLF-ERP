const Approval = require('../models/Approval');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const RFQ = require('../models/RFQ');
const notify = require('./notificationService');

const MODELS = { PurchaseOrder, Invoice, RFQ };

// How an approve/reject decision maps onto the underlying entity's status.
const TRANSITIONS = {
  PurchaseOrder: { Approved: 'Approved', Rejected: 'Rejected' },
  Invoice: { Approved: 'Sent', Rejected: 'Cancelled' },
  RFQ: { Approved: 'Published', Rejected: 'Cancelled' },
};

function httpError(message, statusCode = 400) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

// Open an approval task for an entity. Idempotent: if one is already pending
// for the same entity, return it instead of creating a duplicate.
async function openApproval({ refModel, refId, type, vendor = '—', amount = 0, requestedBy = '', priority = 'medium', userId = null }) {
  const existing = await Approval.findOne({ refModel, refId, status: 'Pending', createdBy: userId });
  if (existing) return existing;

  const approval = await Approval.create({ refModel, refId, type, vendor, amount, requestedBy, priority, createdBy: userId });
  await notify.record({
    userId,
    actor: requestedBy || 'System',
    action: 'requested approval',
    entityType: refModel,
    entityId: refId,
    message: `${type} ${refId} submitted for approval`,
  });
  return approval;
}

// Apply a decision: updates the approval AND flows the result back to the
// underlying PO / Invoice / RFQ. This is the cross-module "connection".
async function decide(approvalId, { decision, decidedBy = '', comment = '', userId = null }) {
  if (!['Approved', 'Rejected'].includes(decision)) {
    throw httpError('Decision must be "Approved" or "Rejected".', 422);
  }

  // Scope to the owner's account: you can only decide your own approvals.
  const approval = userId
    ? await Approval.findOne({ _id: approvalId, createdBy: userId })
    : await Approval.findById(approvalId);
  if (!approval) throw httpError('Approval not found.', 404);
  if (approval.status !== 'Pending') {
    throw httpError(`This item was already ${approval.status.toLowerCase()}.`, 409);
  }

  // Flow the decision to the source entity (same owner).
  const Model = MODELS[approval.refModel];
  let entity = null;
  if (Model) {
    entity = await Model.findOne({ code: approval.refId, createdBy: approval.createdBy });
    const nextStatus = TRANSITIONS[approval.refModel]?.[decision];
    if (entity && nextStatus) {
      entity.status = nextStatus;
      if (approval.refModel === 'PurchaseOrder' && decision === 'Approved') {
        entity.approvedBy = decidedBy;
      }
      await entity.save();
    }
  }

  approval.status = decision;
  approval.decision = decision;
  approval.decidedBy = decidedBy;
  approval.decidedAt = new Date();
  approval.comment = comment;
  await approval.save();

  await notify.record({
    userId,
    actor: decidedBy || 'System',
    action: decision === 'Approved' ? 'approved' : 'rejected',
    entityType: approval.refModel,
    entityId: approval.refId,
    message: `${approval.type} ${approval.refId} ${decision.toLowerCase()} by ${decidedBy || 'an approver'}`,
  });

  return { approval, entity };
}

module.exports = { openApproval, decide, TRANSITIONS };
