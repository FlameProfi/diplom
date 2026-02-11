export const Role = {
  ADMIN: 'ADMIN',
  LOGIST: 'LOGIST',
  WAREHOUSE_WORKER: 'WAREHOUSE_WORKER',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CLIENT: 'CLIENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

const roleHierarchy = new Map<Role, number>([
  [Role.CLIENT, 0],
  [Role.WAREHOUSE_WORKER, 1],
  [Role.LOGIST, 2],
  [Role.ACCOUNTANT, 2],
  [Role.MANAGER, 3],
  [Role.ADMIN, 4],
]);

export const hasPermission = (userRole: Role, requiredRole: Role): boolean => {
  const userLevel = roleHierarchy.get(userRole);
  const requiredLevel = roleHierarchy.get(requiredRole);

  if (userLevel === undefined || requiredLevel === undefined) return false;
  return userLevel >= requiredLevel;
};
