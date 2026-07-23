// Human-readable labels for the capability names the server enforces
// (see server/src/models/Organization.js → DEFAULT_MEMBER_PERMISSIONS).
// Keeping the order here fixed gives the permission grids a stable layout.

export const PERMISSION_LABELS = {
  canManageVendors: { label: "Manage vendors", hint: "Add, edit and remove vendors" },
  canCreateRFQ: { label: "Manage RFQs & quotes", hint: "Create and publish RFQs, record quotations" },
  canCreatePO: { label: "Manage purchase orders", hint: "Award quotes and manage POs" },
  canApprove: { label: "Approve", hint: "Sign off on purchase orders, invoices and RFQs" },
  canSendInvoices: { label: "Manage invoices", hint: "Raise, settle and email invoices" },
  canViewReports: { label: "View reports", hint: "See spend analytics and the activity feed" },
  canChat: { label: "Team chat", hint: "Read and post in team channels" },
  canInviteMembers: { label: "Invite members", hint: "Send invitations to join the workspace" },
  canManageMembers: { label: "Manage members", hint: "Change roles and permissions, remove members" },
  canManageOrgSettings: { label: "Workspace settings", hint: "Rename the workspace and set member defaults" },
};

export const PERMISSION_ORDER = Object.keys(PERMISSION_LABELS);

// Roles an owner may assign (the platform `admin` role is never handed out here).
export const ASSIGNABLE_ROLES = ["manager", "approver", "buyer", "vendor"];
