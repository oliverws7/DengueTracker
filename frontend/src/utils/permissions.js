export const ROLES = {
  ADMIN: 'admin',
  HEALTH_AGENT: 'health_agent',
  MUNICIPAL_MANAGER: 'municipal_manager',
  STATE_MANAGER: 'state_manager',
  VIEWER: 'viewer',
};

export const PERMISSIONS = {
  // Casos
  VIEW_CASES: 'view_cases',
  CREATE_CASES: 'create_cases',
  EDIT_CASES: 'edit_cases',
  DELETE_CASES: 'delete_cases',
  EXPORT_CASES: 'export_cases',
  
  // Relatórios
  VIEW_REPORTS: 'view_reports',
  CREATE_REPORTS: 'create_reports',
  EXPORT_REPORTS: 'export_reports',
  
  // Usuários
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  
  // Configurações
  MANAGE_SETTINGS: 'manage_settings',
  
  // Notificações
  SEND_NOTIFICATIONS: 'send_notifications',
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  
  [ROLES.STATE_MANAGER]: [
    PERMISSIONS.VIEW_CASES,
    PERMISSIONS.CREATE_CASES,
    PERMISSIONS.EDIT_CASES,
    PERMISSIONS.EXPORT_CASES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.CREATE_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.SEND_NOTIFICATIONS,
  ],
  
  [ROLES.MUNICIPAL_MANAGER]: [
    PERMISSIONS.VIEW_CASES,
    PERMISSIONS.CREATE_CASES,
    PERMISSIONS.EDIT_CASES,
    PERMISSIONS.EXPORT_CASES,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.SEND_NOTIFICATIONS,
  ],
  
  [ROLES.HEALTH_AGENT]: [
    PERMISSIONS.VIEW_CASES,
    PERMISSIONS.CREATE_CASES,
    PERMISSIONS.EDIT_CASES,
  ],
  
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_CASES,
    PERMISSIONS.VIEW_REPORTS,
  ],
};

export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
};

export const ProtectedComponent = ({ user, permission, children, fallback = null }) => {
  return hasPermission(user, permission) ? children : fallback;
};