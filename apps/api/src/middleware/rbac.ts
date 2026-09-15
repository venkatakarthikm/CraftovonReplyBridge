// apps/api/src/middleware/rbac.ts
// Role-based access control middleware
// Roles: owner > admin > member
// Per 05-security-rbac.md (reconstructed): members cannot access billing or admin endpoints
import type { Request, Response, NextFunction } from 'express';

type Role = 'owner' | 'admin' | 'member';

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/**
 * Require the user to have at least the specified role level.
 * Usage: router.post('/billing', requireAuth, requireRole('admin'), handler)
 */
export function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req.user?.role ?? 'member') as Role;
    if ((ROLE_HIERARCHY[userRole] ?? 0) < ROLE_HIERARCHY[minRole]) {
      res.status(403).json({
        error: {
          code: 'forbidden',
          message: `Requires ${minRole} role or above`,
        },
      });
      return;
    }
    next();
  };
}

/** Convenience — billing endpoints require admin+ */
export const requireAdmin = requireRole('admin');

/** Convenience — owner-only endpoints (e.g. workspace deletion) */
export const requireOwner = requireRole('owner');

/**
 * Ensure the resource being accessed belongs to the requesting user.
 * Call after loading the resource; pass the resource's userId.
 */
export function assertOwnership(resourceUserId: string, req: Request, res: Response): boolean {
  if (resourceUserId !== req.user?.sub) {
    res.status(403).json({
      error: { code: 'forbidden', message: 'You do not own this resource' },
    });
    return false;
  }
  return true;
}
