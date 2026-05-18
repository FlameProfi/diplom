export const Role = {
  ADMIN: 'ADMIN',
  LOGIST: 'LOGIST',
  WAREHOUSE_WORKER: 'WAREHOUSE_WORKER',
  MANAGER: 'MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  CLIENT: 'CLIENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const hasPermission = (userRole: string, allowedRoles: Role[]): boolean => {
  return allowedRoles.includes(userRole as Role);
};
