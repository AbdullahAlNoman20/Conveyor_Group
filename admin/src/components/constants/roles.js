// Six primary user roles defined in the CCCMS SRS, Section 4.
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  KITCHEN_HEAD: "kitchen_head",
  WAITER: "waiter",
  CLIENT: "client",
  GUEST: "guest",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.KITCHEN_HEAD]: "Kitchen Head",
  [ROLES.WAITER]: "Waiter",
  [ROLES.CLIENT]: "Client",
  [ROLES.GUEST]: "Guest",
};

// Where each role lands immediately after login (SRS Sections 12-17).
export const ROLE_HOME_ROUTE = {
  [ROLES.SUPER_ADMIN]: "/app/super-admin",
  [ROLES.MANAGER]: "/app/manager",
  [ROLES.KITCHEN_HEAD]: "/app/kitchen",
  [ROLES.WAITER]: "/app/waiter",
  [ROLES.CLIENT]: "/app/client",
  [ROLES.GUEST]: "/app/guest",
};

// Role hierarchy, SRS Section 5.
export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.MANAGER, ROLES.CLIENT, ROLES.GUEST],
  [ROLES.MANAGER]: [ROLES.KITCHEN_HEAD, ROLES.WAITER],
  [ROLES.KITCHEN_HEAD]: [],
  [ROLES.WAITER]: [],
  [ROLES.CLIENT]: [],
  [ROLES.GUEST]: [],
};

export const ROLE_BADGE_COLOR = {
  [ROLES.SUPER_ADMIN]: "bg-ink-950 text-white",
  [ROLES.MANAGER]: "bg-brand-600 text-white",
  [ROLES.KITCHEN_HEAD]: "bg-amber-600 text-white",
  [ROLES.WAITER]: "bg-sky-600 text-white",
  [ROLES.CLIENT]: "bg-emerald-600 text-white",
  [ROLES.GUEST]: "bg-ink-400 text-white",
};
