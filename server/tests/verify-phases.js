/**
 * Comprehensive verification: Phase 1 (Organization foundation),
 * Phase 2 (org is the isolation boundary), Phase 3 (invitations, member
 * directory, permissions).
 *
 * Drives the REAL controllers / services / middleware against an in-memory
 * MongoDB. No mocks except the invitation email, which we intercept only to
 * capture the link (the raw token never appears in any API response by design).
 *
 * Run from the server folder:  npm test
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

// --- Intercept the invitation email BEFORE teamController destructures it ---
const emailService = require('../src/services/emailService');
let lastInvite = null;
emailService.sendInvitationMail = async (to, opts) => {
  lastInvite = { to, ...opts };
  return { delivered: false, simulated: true };
};

const env = require('../src/config/env');

// ---------------------------------------------------------------- harness ---
let group = '';
const results = [];
const section = (g) => { group = g; console.log(`\n──── ${g} ────`); };
function check(name, pass, extra = '') {
  results.push({ group, name, pass });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? `  :: ${extra}` : ''}`);
}
const eq = (a, b) => String(a) === String(b);

function mkRes() {
  return {
    statusCode: 200, body: null, _sent: false,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this._sent = true; return this; },
  };
}

// Run an Express middleware chain. Controllers end by calling res.json();
// middleware continue by calling next(). next(err) surfaces as a thrown error.
async function runChain(mws, ctx = {}) {
  const req = {
    user: ctx.user, body: ctx.body || {}, query: ctx.query || {}, params: ctx.params || {},
    headers: ctx.headers || {},
    get(n) { return this.headers[String(n).toLowerCase()]; },
  };
  const res = mkRes();
  for (const mw of mws) {
    let proceed = false; let err = null;
    await mw(req, res, (e) => { if (e) err = e; else proceed = true; });
    if (err) throw err;
    if (!proceed) break;
  }
  return { res, req };
}
const call = async (handler, ctx) => (await runChain([handler], ctx)).res;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

(async () => {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('wolf_all'));

  const User = require('../src/models/User.js');
  const Organization = require('../src/models/Organization.js');
  const Invitation = require('../src/models/Invitation.js');
  const Vendor = require('../src/models/Vendor.js');
  const RFQ = require('../src/models/RFQ.js');
  const Quotation = require('../src/models/Quotation.js');
  const PurchaseOrder = require('../src/models/PurchaseOrder.js');
  const Invoice = require('../src/models/Invoice.js');
  const Approval = require('../src/models/Approval.js');
  const ActivityLog = require('../src/models/ActivityLog.js');
  const KnowledgeChunk = require('../src/models/KnowledgeChunk.js');
  const Channel = require('../src/models/Channel.js');
  const Message = require('../src/models/Message.js');

  const authCtrl = require('../src/controllers/authController.js');
  const vendorCtrl = require('../src/controllers/vendorController.js');
  const rfqCtrl = require('../src/controllers/rfqController.js');
  const quoteCtrl = require('../src/controllers/quotationController.js');
  const poCtrl = require('../src/controllers/purchaseOrderController.js');
  const invCtrl = require('../src/controllers/invoiceController.js');
  const apprCtrl = require('../src/controllers/approvalController.js');
  const reportCtrl = require('../src/controllers/reportController.js');
  const teamCtrl = require('../src/controllers/teamController.js');
  const orgCtrl = require('../src/controllers/organizationController.js');
  const chatCtrl = require('../src/controllers/chatController.js');

  const { protect } = require('../src/middleware/auth.js');
  const { can, effectivePermissions } = require('../src/middleware/permission.js');
  const { ensureOrganizationForUser } = require('../src/services/organizationService.js');
  const { compareRfq } = require('../src/services/comparisonService.js');
  const { runDormancyCleanup } = require('../src/services/cleanupService.js');
  const { migrateToOrganizations } = require('../src/scripts/migrateToOrganizations.js');

  const quietLog = { info() {}, warn() {}, error() {} };
  async function resetDb() {
    for (const c of await mongoose.connection.db.collections()) await c.deleteMany({});
  }
  async function makeWorkspace(orgName, personName, email) {
    const owner = await User.create({ name: personName, email, password: 'Passw0rd1', role: 'manager' });
    const org = await Organization.create({ name: orgName, ownerId: owner._id });
    await User.updateOne({ _id: owner._id }, { $set: { organization: org._id } });
    owner.organization = org._id;
    return { org, owner };
  }

  // ===========================================================================
  section('PHASE 1 — Organization foundation');

  // Organization requires name + ownerId
  let orgValidationFailed = false;
  try { await Organization.create({ name: 'No Owner' }); } catch { orgValidationFailed = true; }
  check('Organization requires an ownerId', orgValidationFailed);

  // register creates an org named from `company`, owned by the new user
  const reg1 = await call(authCtrl.register, { body: { name: 'Rita', email: 'rita@x.com', password: 'Passw0rd1', role: 'manager', company: 'Rita Corp' } });
  const rita = await User.findOne({ email: 'rita@x.com' });
  const ritaOrg = await Organization.findById(rita.organization);
  check('register → 201 and links an organization', reg1.statusCode === 201 && !!reg1.body?.user?.organization);
  check('org is named from `company`', ritaOrg?.name === 'Rita Corp', ritaOrg?.name);
  check('registrant owns their org', eq(ritaOrg?.ownerId, rita._id));

  // register with no company → "<name>'s Workspace"
  await call(authCtrl.register, { body: { name: 'Sam', email: 'sam@x.com', password: 'Passw0rd1', role: 'buyer' } });
  const sam = await User.findOne({ email: 'sam@x.com' });
  const samOrg = await Organization.findById(sam.organization);
  check('org falls back to "<name>\'s Workspace"', samOrg?.name === "Sam's Workspace", samOrg?.name);

  // Duplicate email still blocked (one account per email)
  const dup = await call(authCtrl.register, { body: { name: 'Rita2', email: 'rita@x.com', password: 'Passw0rd1' } });
  check('duplicate email rejected (409)', dup.statusCode === 409);

  // Every business model accepts `organization`
  const okOrg = ritaOrg._id;
  await Vendor.create({ code: 'V-9001', name: 'T', organization: okOrg, createdBy: rita._id });
  await RFQ.create({ code: 'RFQ-9001', title: 'T', organization: okOrg, createdBy: rita._id });
  await Quotation.create({ code: 'Q-9001', vendor: 'T', organization: okOrg, createdBy: rita._id });
  await PurchaseOrder.create({ code: 'PO-9001', vendor: 'T', organization: okOrg, createdBy: rita._id });
  await Invoice.create({ code: 'INV-9001', vendor: 'T', organization: okOrg, createdBy: rita._id });
  await Approval.create({ type: 'Invoice', refModel: 'Invoice', refId: 'INV-9001', organization: okOrg, createdBy: rita._id });
  await ActivityLog.create({ action: 'probe', organization: okOrg, userId: rita._id });
  const stamped = await Promise.all([
    Vendor.countDocuments({ organization: okOrg }), RFQ.countDocuments({ organization: okOrg }),
    Quotation.countDocuments({ organization: okOrg }), PurchaseOrder.countDocuments({ organization: okOrg }),
    Invoice.countDocuments({ organization: okOrg }), Approval.countDocuments({ organization: okOrg }),
    // scoped by action: register() already wrote an org-stamped 'registered' event
    ActivityLog.countDocuments({ organization: okOrg, action: 'probe' }),
  ]);
  check('all 7 business models persist `organization`', stamped.every((n) => n === 1), stamped.join(','));
  // and that register's own audit event is org-stamped
  check('register writes an org-stamped activity event', (await ActivityLog.countDocuments({ organization: okOrg, action: 'registered' })) === 1);

  // ===========================================================================
  section('PHASE 1 — migration script (backfill)');
  await resetDb();

  const legacy = await User.create({ name: 'Legacy Lee', email: 'lee@x.com', password: 'Passw0rd1', company: 'Lee Ltd' });
  check('legacy user starts with no organization', !legacy.organization);
  await Vendor.create({ code: 'V-1', name: 'LegacyVendor', createdBy: legacy._id });
  await RFQ.create({ code: 'RFQ-1', title: 'LegacyRFQ', createdBy: legacy._id });
  await Invoice.create({ code: 'INV-1', vendor: 'LegacyVendor', createdBy: legacy._id });
  await ActivityLog.create({ action: 'legacy', userId: legacy._id });
  await KnowledgeChunk.create({ owner: legacy._id, source: 'vendor', sourceId: 'V-1', text: 'legacy chunk' });

  const dry = await migrateToOrganizations({ dryRun: true, log: quietLog });
  const leeAfterDry = await User.findById(legacy._id);
  check('dry-run reports work without changing anything', dry.orgsCreated === 1 && dry.recordsStamped === 5 && !leeAfterDry.organization, `orgs=${dry.orgsCreated} stamped=${dry.recordsStamped}`);

  const applied = await migrateToOrganizations({ log: quietLog });
  const lee = await User.findById(legacy._id);
  const leeOrg = await Organization.findById(lee.organization);
  check('migration creates the org and links the user', applied.orgsCreated === 1 && !!lee.organization);
  check('org name comes from company', leeOrg?.name === 'Lee Ltd');
  check('migration stamps all 5 legacy records', applied.recordsStamped === 5, `stamped=${applied.recordsStamped}`);
  const migrated = await Promise.all([
    Vendor.countDocuments({ organization: lee.organization }), RFQ.countDocuments({ organization: lee.organization }),
    Invoice.countDocuments({ organization: lee.organization }), ActivityLog.countDocuments({ organization: lee.organization }),
    KnowledgeChunk.countDocuments({ organization: lee.organization }),
  ]);
  check('Vendor/RFQ/Invoice/ActivityLog/KnowledgeChunk all stamped', migrated.every((n) => n === 1), migrated.join(','));

  const again = await migrateToOrganizations({ log: quietLog });
  const leeAgain = await User.findById(legacy._id);
  check('migration is idempotent (no new org, nothing re-stamped)', again.orgsCreated === 0 && again.recordsStamped === 0);
  check('idempotent run keeps the SAME org (no duplicate)', eq(leeAgain.organization, lee.organization));
  check('only one Organization exists for the legacy user', (await Organization.countDocuments({ ownerId: legacy._id })) === 1);

  // ===========================================================================
  section('PHASE 2 — org isolation across every entity');
  await resetDb();

  const { org: org1, owner: alice } = await makeWorkspace('Org One', 'Alice', 'alice@x.com');
  const bob = await User.create({ name: 'Bob', email: 'bob@x.com', password: 'Passw0rd1', role: 'approver', organization: org1._id });
  const { org: org2, owner: carol } = await makeWorkspace('Org Two', 'Carol', 'carol@x.com');

  // Alice creates one of each entity in Org1
  const vRes = await call(vendorCtrl.create, { user: alice, body: { name: 'Acme Supplies', category: 'Electronics', email: 'sales@acme.com' } });
  const vCode = vRes.body.data.id;
  const rRes = await call(rfqCtrl.create, { user: alice, body: { title: 'Laptops', category: 'Electronics', invitedVendors: [vCode], items: [{ name: 'Laptop', qty: 10, unit: 'pcs' }], publish: true } });
  const rCode = rRes.body.data.id;
  const qRes = await call(quoteCtrl.create, { user: bob, body: { rfqId: rCode, vendor: 'Acme Supplies', vendorId: vCode, deliveryDays: 10, items: [{ name: 'Laptop', qty: 10, unitPrice: 50000 }] } });
  const qCode = qRes.body.data.id;
  // a losing sibling quote, to prove award rejects it
  const q2Res = await call(quoteCtrl.create, { user: alice, body: { rfqId: rCode, vendor: 'Other Co', vendorId: 'V-9999', deliveryDays: 20, items: [{ name: 'Laptop', qty: 10, unitPrice: 60000 }] } });
  const q2Code = q2Res.body.data.id;
  // Carol gets her own vendor so we can prove her data survives Org1's wipe later
  await call(vendorCtrl.create, { user: carol, body: { name: 'Carol Vendor', category: 'Travel' } });

  check('Bob (same org) created a quotation', qRes.statusCode === 201 && !!qCode);

  // Vendors
  check('vendor: same-org member sees it', (await call(vendorCtrl.list, { user: bob })).body.data.some((v) => v.name === 'Acme Supplies'));
  check('vendor: other org does NOT see it', !(await call(vendorCtrl.list, { user: carol })).body.data.some((v) => v.name === 'Acme Supplies'));
  check('vendor: same-org getOne 200', (await call(vendorCtrl.getOne, { user: bob, params: { id: vCode } })).statusCode === 200);
  check('vendor: other-org getOne 404', (await call(vendorCtrl.getOne, { user: carol, params: { id: vCode } })).statusCode === 404);
  check('vendor: other-org delete 404', (await call(vendorCtrl.remove, { user: carol, params: { id: vCode } })).statusCode === 404);
  check('vendor: other-org update 404', (await call(vendorCtrl.update, { user: carol, params: { id: vCode }, body: { name: 'hacked' } })).statusCode === 404);

  // RFQs
  check('rfq: same-org member sees it', (await call(rfqCtrl.list, { user: bob })).body.data.length === 1);
  check('rfq: other org sees none', (await call(rfqCtrl.list, { user: carol })).body.data.length === 0);
  check('rfq: other-org getOne 404', (await call(rfqCtrl.getOne, { user: carol, params: { id: rCode } })).statusCode === 404);

  // Quotations
  check('quotation: same-org sees both quotes', (await call(quoteCtrl.list, { user: alice })).body.data.length === 2);
  check('quotation: other org sees none', (await call(quoteCtrl.list, { user: carol })).body.data.length === 0);
  check('quotation: other-org getOne 404', (await call(quoteCtrl.getOne, { user: carol, params: { id: qCode } })).statusCode === 404);

  // Comparison service is org-scoped
  const cmp1 = await compareRfq(rCode, org1._id);
  const cmp2 = await compareRfq(rCode, org2._id);
  check('compareRfq returns the org\'s quotes', cmp1.vendors.length === 2 && cmp1.summary.lowestAmount === 500000, `low=${cmp1.summary.lowestAmount}`);
  check('compareRfq for another org returns nothing', cmp2.vendors.length === 0);

  // ===========================================================================
  section('PHASE 2 — cross-entity workflow (award → PO → approval → invoice)');

  const award = await call(quoteCtrl.award, { user: alice, params: { id: qCode }, body: {} });
  const poCode = award.body.purchaseOrder.id;
  const rfqAfter = await RFQ.findOne({ code: rCode });
  const sibling = await Quotation.findOne({ code: q2Code });
  const poDoc = await PurchaseOrder.findOne({ code: poCode });
  check('award drafts a PO', award.statusCode === 200 && !!poCode, poCode);
  check('award stamps the PO with the organization', eq(poDoc.organization, org1._id));
  check('award marks the RFQ Awarded', rfqAfter.status === 'Awarded');
  check('award rejects the sibling quote', sibling.status === 'Rejected');
  check('PO visible to same-org member', (await call(poCtrl.getOne, { user: bob, params: { id: poCode } })).statusCode === 200);
  check('PO hidden from other org', (await call(poCtrl.getOne, { user: carol, params: { id: poCode } })).statusCode === 404);

  // Submit for approval (idempotent within the org)
  await call(poCtrl.submit, { user: alice, params: { id: poCode }, body: {} });
  await call(poCtrl.submit, { user: alice, params: { id: poCode }, body: {} });
  const pendingCount = await Approval.countDocuments({ organization: org1._id, refId: poCode, status: 'Pending' });
  check('openApproval is idempotent within the org (1 pending)', pendingCount === 1, `count=${pendingCount}`);

  const apprList = await call(apprCtrl.list, { user: bob, query: {} });
  const apprId = apprList.body.data[0].id;
  check('approval visible to same-org approver', apprList.body.data.length === 1);
  check('approval NOT visible to other org', (await call(apprCtrl.list, { user: carol, query: {} })).body.data.length === 0);

  // Cross-org decide must fail
  let crossDecideStatus = 0;
  try {
    await call(apprCtrl.decide, { user: carol, params: { id: apprId }, body: { decision: 'Approved' } });
  } catch (e) { crossDecideStatus = e.statusCode; }
  check('other org cannot decide the approval (404)', crossDecideStatus === 404, `status=${crossDecideStatus}`);

  // Same-org approver decides → flows back to the PO
  const decided = await call(apprCtrl.decide, { user: bob, params: { id: apprId }, body: { decision: 'Approved' } });
  const poApproved = await PurchaseOrder.findOne({ code: poCode });
  check('same-org approver can decide', decided.statusCode === 200);
  check('decision flows back to the PO (Approved)', poApproved.status === 'Approved', poApproved.status);
  check('approvedBy recorded', poApproved.approvedBy === 'Bob');

  // Deciding twice is a conflict
  let secondDecide = 0;
  try { await call(apprCtrl.decide, { user: bob, params: { id: apprId }, body: { decision: 'Approved' } }); }
  catch (e) { secondDecide = e.statusCode; }
  check('re-deciding an approval is 409', secondDecide === 409);

  // Invoice from PO, send, pay
  const invRes = await call(invCtrl.create, { user: bob, body: { poId: poCode } });
  const invCode = invRes.body.data.id;
  check('invoice seeded from PO (vendor + amount pulled)', invRes.body.data.vendor === 'Acme Supplies' && invRes.body.data.amount === 500000, `amt=${invRes.body.data.amount}`);
  check('invoice hidden from other org', (await call(invCtrl.getOne, { user: carol, params: { id: invCode } })).statusCode === 404);
  const sent = await call(invCtrl.send, { user: alice, params: { id: invCode }, body: { to: 'ap@acme.com' } });
  check('invoice send marks Sent + email simulated (SMTP off)', sent.body.data.status === 'Sent' && sent.body.email.simulated === true);
  const paid = await call(invCtrl.recordPayment, { user: alice, params: { id: invCode }, body: { amount: 500000 } });
  check('full payment reconciles to Paid', paid.body.data.status === 'Paid', paid.body.data.status);

  // ===========================================================================
  section('PHASE 2 — reports & activity feed are org-scoped');

  const sumBob = await call(reportCtrl.summary, { user: bob });
  const sumCarol = await call(reportCtrl.summary, { user: carol });
  check('summary reflects whole-org data for a member', sumBob.body.data.vendors.total === 1 && sumBob.body.data.rfqs.total === 1 && sumBob.body.data.purchaseOrders.total === 1 && sumBob.body.data.invoices.total === 1);
  check('summary counts org spend (approved PO)', sumBob.body.data.purchaseOrders.totalSpend === 500000, String(sumBob.body.data.purchaseOrders.totalSpend));
  check('other org summary sees only its own vendor', sumCarol.body.data.vendors.total === 1 && sumCarol.body.data.rfqs.total === 0 && sumCarol.body.data.purchaseOrders.totalSpend === 0);

  const cat = await call(reportCtrl.spendByCategory, { user: bob });
  const byVendor = await call(reportCtrl.spendByVendor, { user: bob });
  check('spend-by-category is org-scoped', cat.body.data.length === 1 && cat.body.data[0].category === 'Electronics');
  check('spend-by-vendor is org-scoped', byVendor.body.data.length === 1 && byVendor.body.data[0].amount === 500000);
  check('other org has no spend-by-vendor', (await call(reportCtrl.spendByVendor, { user: carol })).body.data.length === 0);

  const feedBob = await call(reportCtrl.activity, { user: bob, query: { limit: 50 } });
  const feedCarol = await call(reportCtrl.activity, { user: carol, query: { limit: 50 } });
  check('activity feed is shared across the org', feedBob.body.data.some((e) => (e.message || '').includes('Acme Supplies')));
  check('activity feed excludes other orgs', !feedCarol.body.data.some((e) => (e.message || '').includes('Acme Supplies')));

  // ===========================================================================
  section('PHASE 3 — invitations');

  // Owner can invite even with an empty permissions map (owner ⇒ all rights)
  const inv1 = await runChain([can('canInviteMembers'), teamCtrl.invite], { user: alice, body: { email: 'dan@x.com', role: 'buyer' } });
  check('owner passes can(canInviteMembers) with empty permissions', inv1.res.statusCode === 201);
  check('invite response never leaks tokenHash', inv1.res.body && !('tokenHash' in inv1.res.body.data));
  check('invitation email was sent with an accept link', !!lastInvite && lastInvite.to === 'dan@x.com' && lastInvite.link.includes('/accept-invite?token='));
  const danToken = new URL(lastInvite.link).searchParams.get('token');
  check('emailed link carries a raw token', !!danToken && danToken.length >= 32);

  // Plain member without the capability is blocked
  const bobFresh = await User.findById(bob._id);
  const blocked = await runChain([can('canInviteMembers'), teamCtrl.invite], { user: bobFresh, body: { email: 'nope@x.com' } });
  check('member without canInviteMembers → 403', blocked.res.statusCode === 403);

  // Grant Bob the capability → now allowed
  await User.updateOne({ _id: bob._id }, { $set: { permissions: { canInviteMembers: true } } });
  const bobCan = await User.findById(bob._id);
  const allowed = await runChain([can('canInviteMembers'), teamCtrl.invite], { user: bobCan, body: { email: 'erin@x.com' } });
  check('member WITH canInviteMembers → 201', allowed.res.statusCode === 201);

  // Duplicates & existing accounts
  check('duplicate pending invite → 409', (await call(teamCtrl.invite, { user: alice, body: { email: 'dan@x.com' } })).statusCode === 409);
  check('inviting an existing account → 409', (await call(teamCtrl.invite, { user: alice, body: { email: 'carol@x.com' } })).statusCode === 409);

  // Role/permission hardening on the invite
  await call(teamCtrl.invite, { user: alice, body: { email: 'frank@x.com', role: 'admin', permissions: { canApprove: true, notARealPermission: true } } });
  const frankInv = await Invitation.findOne({ email: 'frank@x.com' });
  check('invite cannot grant the admin role (coerced)', frankInv.role === 'buyer', frankInv.role);
  check('invite stores requested known permission', frankInv.permissions.canApprove === true);
  check('invite strips unknown permission keys', !('notARealPermission' in frankInv.permissions));

  // Preview
  const preview = await call(teamCtrl.previewInvite, { params: { token: danToken } });
  check('previewInvite shows org + email + role', preview.statusCode === 200 && preview.body.data.organization === 'Org One' && preview.body.data.email === 'dan@x.com');
  check('previewInvite with a bad token → 400', (await call(teamCtrl.previewInvite, { params: { token: 'garbage' } })).statusCode === 400);

  // ===========================================================================
  section('PHASE 3 — accepting an invitation');

  const accepted = await call(teamCtrl.acceptInvite, { body: { token: danToken, name: 'Dan', password: 'Passw0rd1' } });
  const dan = await User.findOne({ email: 'dan@x.com' });
  check('accept → 201 with a session token', accepted.statusCode === 201 && !!accepted.body.token);
  check('accepted member joins the INVITING org (no new workspace)', eq(dan.organization, org1._id));
  check('accepted member gets the invited role', dan.role === 'buyer');
  check('only one Organization still exists for Org One owner', (await Organization.countDocuments({ ownerId: alice._id })) === 1);
  check('invitation marked accepted', (await Invitation.findOne({ email: 'dan@x.com' })).status === 'accepted');

  // The whole point: the new member immediately sees the workspace's data
  const danVendors = await call(vendorCtrl.list, { user: dan });
  const danInvoices = await call(invCtrl.list, { user: dan });
  check('NEW MEMBER SEES the org\'s existing vendors (sharing works)', danVendors.body.data.some((v) => v.name === 'Acme Supplies'));
  check('NEW MEMBER SEES the org\'s existing invoices', danInvoices.body.data.length === 1);

  // Token reuse / revoked / expired
  check('reusing an accepted token → 400', (await call(teamCtrl.acceptInvite, { body: { token: danToken, name: 'X', password: 'Passw0rd1' } })).statusCode === 400);

  const erinInv = await Invitation.findOne({ email: 'erin@x.com' });
  await call(teamCtrl.revokeInvite, { user: alice, params: { id: String(erinInv._id) } });
  check('revoke marks the invite revoked', (await Invitation.findById(erinInv._id)).status === 'revoked');
  check('revoking a non-pending invite → 404', (await call(teamCtrl.revokeInvite, { user: alice, params: { id: String(erinInv._id) } })).statusCode === 404);

  const expiredRaw = crypto.randomBytes(16).toString('hex');
  await Invitation.create({ organization: org1._id, email: 'old@x.com', role: 'buyer', tokenHash: sha256(expiredRaw), invitedBy: alice._id, expiresAt: new Date(Date.now() - 1000) });
  check('expired token cannot be accepted → 400', (await call(teamCtrl.acceptInvite, { body: { token: expiredRaw, name: 'Old', password: 'Passw0rd1' } })).statusCode === 400);

  // ===========================================================================
  section('PHASE 3 — member directory & administration');

  const dir = await call(teamCtrl.members, { user: alice });
  const names = dir.body.data.map((m) => m.name).sort();
  const aliceRow = dir.body.data.find((m) => m.isOwner);
  check('directory lists every member with name + email', dir.body.count === 3 && names.join(',') === 'Alice,Bob,Dan', names.join(','));
  check('directory exposes registered email addresses', dir.body.data.every((m) => !!m.email));
  check('owner is flagged and shown with all permissions', aliceRow.name === 'Alice' && aliceRow.permissions.canManageOrgSettings === true);
  check('directory reports canManage for the owner', dir.body.canManage === true);

  // A plain member can read the directory (default: visible)
  const danFresh = await User.findById(dan._id);
  check('plain member can read the directory by default', (await call(teamCtrl.members, { user: danFresh })).statusCode === 200);

  // Owner hides the directory → plain member blocked, owner still sees it
  await Organization.updateOne({ _id: org1._id }, { $set: { 'settings.directoryVisibleToMembers': false } });
  check('hidden directory → plain member 403', (await call(teamCtrl.members, { user: danFresh })).statusCode === 403);
  check('hidden directory → owner still 200', (await call(teamCtrl.members, { user: alice })).statusCode === 200);
  await User.updateOne({ _id: dan._id }, { $set: { permissions: { canManageMembers: true } } });
  const danMgr = await User.findById(dan._id);
  check('hidden directory → member with canManageMembers 200', (await call(teamCtrl.members, { user: danMgr })).statusCode === 200);
  await Organization.updateOne({ _id: org1._id }, { $set: { 'settings.directoryVisibleToMembers': true } });
  await User.updateOne({ _id: dan._id }, { $set: { permissions: {} } });

  // updateMember
  const upd = await call(teamCtrl.updateMember, { user: alice, params: { id: String(dan._id) }, body: { role: 'approver', permissions: { canApprove: true, bogusKey: true } } });
  const danUpdated = await User.findById(dan._id);
  check('owner can change a member\'s role', upd.statusCode === 200 && danUpdated.role === 'approver');
  check('owner can grant a permission', danUpdated.permissions.canApprove === true);
  check('unknown permission keys are stripped on update', !('bogusKey' in danUpdated.permissions));
  check('cannot assign the admin role (422)', (await call(teamCtrl.updateMember, { user: alice, params: { id: String(dan._id) }, body: { role: 'admin' } })).statusCode === 422);
  check('cannot modify the owner (400)', (await call(teamCtrl.updateMember, { user: alice, params: { id: String(alice._id) }, body: { role: 'buyer' } })).statusCode === 400);
  check('cannot modify a member of another org (404)', (await call(teamCtrl.updateMember, { user: alice, params: { id: String(carol._id) }, body: { role: 'buyer' } })).statusCode === 404);

  // removeMember
  check('cannot remove the owner (400)', (await call(teamCtrl.removeMember, { user: alice, params: { id: String(alice._id) } })).statusCode === 400);
  const removed = await call(teamCtrl.removeMember, { user: alice, params: { id: String(dan._id) } });
  const danAfter = await User.findById(dan._id);
  check('owner can remove a member', removed.statusCode === 200);
  check('removed member is detached from the org', danAfter.organization === null);
  check('removed member disappears from the directory', (await call(teamCtrl.members, { user: alice })).body.count === 2);

  // Removed member self-heals into a fresh, EMPTY personal workspace
  await ensureOrganizationForUser(danAfter);
  const danSolo = await User.findById(dan._id);
  check('removed member gets a fresh workspace', !!danSolo.organization && !eq(danSolo.organization, org1._id));
  check('removed member can no longer see the org\'s data', (await call(vendorCtrl.list, { user: danSolo })).body.data.length === 0);

  // ===========================================================================
  section('PHASE 4 — workspace settings & permission enforcement');

  // A fresh member of Org One holding nothing at all.
  const gina = await User.create({ name: 'Gina', email: 'gina@x.com', password: 'Passw0rd1', role: 'buyer', organization: org1._id, permissions: {} });

  const alicePerms = await effectivePermissions(alice);
  const ginaPerms = await effectivePermissions(gina);
  check('owner effectively holds EVERY permission', Organization.PERMISSION_KEYS.every((k) => alicePerms[k] === true));
  check('member holds only what has been granted', Object.keys(ginaPerms).length === 0);

  const orgGet = await call(orgCtrl.get, { user: alice });
  check('GET /organization returns the workspace profile', orgGet.statusCode === 200 && orgGet.body.data.name === 'Org One' && orgGet.body.data.isOwner === true);
  check('GET /organization reports the member count', orgGet.body.data.memberCount >= 2, String(orgGet.body.data.memberCount));
  check('GET /organization exposes the permission vocabulary', Array.isArray(orgGet.body.permissionKeys) && orgGet.body.permissionKeys.includes('canChat'));
  check('GET /organization reports the caller\'s effective permissions', orgGet.body.permissions.canManageOrgSettings === true);

  const ginaFresh = await User.findById(gina._id);
  const settingsBlocked = await runChain([can('canManageOrgSettings'), orgCtrl.update], { user: ginaFresh, body: { name: 'Hijacked' } });
  check('member without canManageOrgSettings cannot change settings (403)', settingsBlocked.res.statusCode === 403);

  const upd4 = await runChain([can('canManageOrgSettings'), orgCtrl.update], {
    user: alice,
    body: { name: 'Org One HQ', settings: { directoryVisibleToMembers: false, memberDefaultPermissions: { canApprove: true, canChat: false, bogusKey: true } } },
  });
  check('owner can rename the workspace', upd4.res.statusCode === 200 && upd4.res.body.data.name === 'Org One HQ');
  check('owner can hide the member directory', upd4.res.body.data.settings.directoryVisibleToMembers === false);
  check('member defaults keep known keys', upd4.res.body.data.settings.memberDefaultPermissions.canApprove === true && upd4.res.body.data.settings.memberDefaultPermissions.canChat === false);
  check('member defaults strip unknown keys', !('bogusKey' in upd4.res.body.data.settings.memberDefaultPermissions));
  check('empty workspace name → 422', (await call(orgCtrl.update, { user: alice, body: { name: '   ' } })).statusCode === 422);
  check('no-op settings update → 422', (await call(orgCtrl.update, { user: alice, body: {} })).statusCode === 422);

  // The capability actually gates a business route.
  check('member without canApprove is blocked (403)', (await runChain([can('canApprove'), apprCtrl.list], { user: ginaFresh, query: {} })).res.statusCode === 403);
  await User.updateOne({ _id: gina._id }, { $set: { permissions: { canApprove: true } } });
  const ginaApprover = await User.findById(gina._id);
  check('member WITH canApprove passes the gate', (await runChain([can('canApprove'), apprCtrl.list], { user: ginaApprover, query: {} })).res.statusCode === 200);
  check('owner passes canApprove without an explicit grant', (await runChain([can('canApprove'), apprCtrl.list], { user: alice, query: {} })).res.statusCode === 200);

  // New invitees inherit the defaults the owner just configured.
  await call(teamCtrl.invite, { user: alice, body: { email: 'hana@x.com' } });
  const hanaInv = await Invitation.findOne({ email: 'hana@x.com' });
  check('a new invite inherits the workspace default permissions', hanaInv.permissions.canApprove === true && hanaInv.permissions.canChat === false);

  await Organization.updateOne({ _id: org1._id }, { $set: { 'settings.directoryVisibleToMembers': true } });

  // ===========================================================================
  section('PHASE 5 — team chat (cursor polling + isolation)');

  const chans = await call(chatCtrl.listChannels, { user: alice });
  const generalId = chans.body.data[0]?.id;
  check('first visit auto-creates a #general channel', chans.statusCode === 200 && chans.body.count === 1 && chans.body.data[0].name === 'general' && chans.body.data[0].isDefault === true);
  check('a second visit does not duplicate the default channel', (await call(chatCtrl.listChannels, { user: bobCan })).body.count === 1);

  check('empty message → 422', (await call(chatCtrl.postMessage, { user: alice, params: { id: generalId }, body: { body: '   ' } })).statusCode === 422);
  check('oversized message → 422', (await call(chatCtrl.postMessage, { user: alice, params: { id: generalId }, body: { body: 'x'.repeat(2001) } })).statusCode === 422);

  const m1 = await call(chatCtrl.postMessage, { user: alice, params: { id: generalId }, body: { body: 'Morning team' } });
  await call(chatCtrl.postMessage, { user: bobCan, params: { id: generalId }, body: { body: 'Morning!' } });
  check('posting returns the message with a denormalized sender name', m1.statusCode === 201 && m1.body.data.senderName === 'Alice');
  check('channel records lastMessageAt', !!(await Channel.findById(generalId)).lastMessageAt);

  const initial = await call(chatCtrl.listMessages, { user: bobCan, params: { id: generalId }, query: {} });
  const cursor = initial.body.cursor;
  check('initial load returns messages oldest→newest', initial.body.data.length === 2 && initial.body.data[0].body === 'Morning team' && initial.body.data[1].body === 'Morning!');
  check('initial load returns a cursor', !!cursor);

  const idlePoll = await call(chatCtrl.listMessages, { user: alice, params: { id: generalId }, query: { after: cursor } });
  check('an idle poll returns zero messages', idlePoll.body.data.length === 0);
  check('an idle poll holds the cursor steady', idlePoll.body.cursor === cursor);

  await call(chatCtrl.postMessage, { user: alice, params: { id: generalId }, body: { body: 'Standup in 5' } });
  const delta = await call(chatCtrl.listMessages, { user: bobCan, params: { id: generalId }, query: { after: cursor } });
  check('a poll returns ONLY messages after the cursor', delta.body.data.length === 1 && delta.body.data[0].body === 'Standup in 5');
  check('a poll advances the cursor', delta.body.cursor !== cursor);

  check('duplicate channel name → 409', (await call(chatCtrl.createChannel, { user: alice, body: { name: 'general' } })).statusCode === 409);
  const madeChannel = await call(chatCtrl.createChannel, { user: alice, body: { name: 'sourcing', description: 'RFQ chatter' } });
  check('a member can create a channel', madeChannel.statusCode === 201 && madeChannel.body.data.name === 'sourcing');

  const carolChannels = await call(chatCtrl.listChannels, { user: carol });
  check('another org gets its OWN default channel', carolChannels.body.count === 1 && carolChannels.body.data[0].id !== generalId);
  check('another org cannot read this channel (404)', (await call(chatCtrl.listMessages, { user: carol, params: { id: generalId }, query: {} })).statusCode === 404);
  check('another org cannot post to this channel (404)', (await call(chatCtrl.postMessage, { user: carol, params: { id: generalId }, body: { body: 'hi' } })).statusCode === 404);
  check('messages are stamped with the organization', (await Message.countDocuments({ organization: org1._id })) === 3);
  check('the other org has no messages', (await Message.countDocuments({ organization: org2._id })) === 0);

  const noChat = await User.create({ name: 'Ivan', email: 'ivan@x.com', password: 'Passw0rd1', role: 'buyer', organization: org1._id, permissions: { canChat: false } });
  check('member without canChat is blocked (403)', (await runChain([can('canChat'), chatCtrl.listChannels], { user: noChat })).res.statusCode === 403);
  check('owner passes the canChat gate', (await runChain([can('canChat'), chatCtrl.listChannels], { user: alice })).res.statusCode === 200);

  // ===========================================================================
  section('PHASE 2 — protect() self-heals a missing organization');

  const noOrg = await User.create({ name: 'Zed', email: 'zed@x.com', password: 'Passw0rd1', role: 'buyer' });
  check('user starts with no organization', !noOrg.organization);
  const token = jwt.sign({ id: noOrg._id, role: 'buyer' }, env.JWT_SECRET);
  const { req: healedReq } = await runChain([protect], { headers: { authorization: `Bearer ${token}` } });
  const zed = await User.findById(noOrg._id);
  check('protect attaches a user with an organization', !!healedReq.user?.organization);
  check('self-heal persists the organization', !!zed.organization);
  const noTokenRes = await runChain([protect], { headers: {} });
  check('protect without a token → 401', noTokenRes.res.statusCode === 401);

  // ===========================================================================
  section('PHASE 2 — per-organization dormancy cleanup');

  // Org1 goes idle for 40 days; Org2 stays active.
  const longAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  await User.updateMany({ organization: org1._id }, { $set: { lastLoginAt: longAgo } });
  await User.updateMany({ organization: org2._id }, { $set: { lastLoginAt: new Date() } });

  const before2 = await Vendor.countDocuments({ organization: org2._id });
  const report = await runDormancyCleanup({ days: 30 });

  const after1 = await Promise.all([
    Vendor.countDocuments({ organization: org1._id }), RFQ.countDocuments({ organization: org1._id }),
    Quotation.countDocuments({ organization: org1._id }), PurchaseOrder.countDocuments({ organization: org1._id }),
    Invoice.countDocuments({ organization: org1._id }), Approval.countDocuments({ organization: org1._id }),
  ]);
  const after2 = await Vendor.countDocuments({ organization: org2._id });

  check('cleanup reports a dormant workspace', report.wiped === true && report.dormantOrgs === 1, `dormant=${report.dormantOrgs}`);
  check('dormant org\'s business data is wiped', after1.every((n) => n === 0), after1.join(','));
  check('ACTIVE org\'s data is untouched', after2 === before2 && after2 === 1);
  check('dormant org\'s chat is wiped too', (await Channel.countDocuments({ organization: org1._id })) === 0 && (await Message.countDocuments({ organization: org1._id })) === 0);
  check('ACTIVE org\'s chat survives', (await Channel.countDocuments({ organization: org2._id })) === 1);
  check('dormant org\'s pending invitations are wiped', (await Invitation.countDocuments({ organization: org1._id })) === 0);
  check('logins survive the wipe', (await User.countDocuments({})) > 0);
  check('organizations survive the wipe', (await Organization.countDocuments({ _id: org1._id })) === 1);

  const idle = await runDormancyCleanup({ days: 3650 });
  check('nothing wiped when no org is dormant', idle.wiped === false && idle.dormantOrgs === 0);

  // ===========================================================================
  const failed = results.filter((r) => !r.pass);
  const byGroup = {};
  for (const r of results) {
    byGroup[r.group] = byGroup[r.group] || { pass: 0, total: 0 };
    byGroup[r.group].total += 1;
    if (r.pass) byGroup[r.group].pass += 1;
  }
  console.log('\n════════════════ SUMMARY ════════════════');
  for (const [g, s] of Object.entries(byGroup)) console.log(`  ${s.pass === s.total ? '✅' : '❌'} ${s.pass}/${s.total}  ${g}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log('\nFAILED:'); failed.forEach((f) => console.log(`  ✗ [${f.group}] ${f.name}`)); }
  console.log(failed.length ? '\nRESULT: FAIL ❌' : '\nRESULT: PASS ✅');

  await mongoose.disconnect();
  await mem.stop();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('\nTHREW:', e); process.exit(1); });
