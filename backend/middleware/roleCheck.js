/**
 * Role-Based Access Control Middleware
 * 
 * Restricts endpoint access based on user roles
 * 
 * Role Hierarchy:
 * - Admin: Full system access (all operations)
 * - Ranger: Field data entry (sightings, incidents)
 * - Researcher: Read-only access + analytics
 * 
 * Security Rationale:
 * - Principle of least privilege
 * - Defense in depth (works with auth middleware)
 * - Prevents privilege escalation attacks
 */

const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = roleCheck;