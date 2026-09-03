export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  CLIENT: "client",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.MANAGER]: "Manager",
  [ROLES.CLIENT]: "Client",
};

export const ROLE_HOME_ROUTE = {
  [ROLES.SUPER_ADMIN]: "/app/super-admin",
  [ROLES.MANAGER]: "/app/manager",
  [ROLES.CLIENT]: "/app/client",
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: [ROLES.MANAGER, ROLES.CLIENT],
  [ROLES.MANAGER]: [],
  [ROLES.CLIENT]: [],
};

export const ROLE_BADGE_COLOR = {
  [ROLES.SUPER_ADMIN]: "bg-ink-950 text-white",
  [ROLES.MANAGER]: "bg-brand-600 text-white",
  [ROLES.CLIENT]: "bg-emerald-600 text-white",
};