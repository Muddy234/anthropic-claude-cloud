// ============================================================================
// GEOMETRY UTILS - Hit detection functions for ability shapes
// ============================================================================
// These functions determine if a target position is inside various ability shapes.
// Used by enemy-ability-system.js for damage calculation.
// ============================================================================

const GeometryUtils = {
    /**
     * Check if target is inside a cone/pie-slice
     * @param {number} targetX - Target X position (tiles)
     * @param {number} targetY - Target Y position (tiles)
     * @param {number} originX - Cone origin X (tiles)
     * @param {number} originY - Cone origin Y (tiles)
     * @param {number} direction - Direction the cone faces (radians)
     * @param {number} arcAngle - Total cone angle (radians)
     * @param {number} radius - Cone radius (tiles)
     * @returns {boolean} True if target is inside cone
     */
    isInsideCone(targetX, targetY, originX, originY, direction, arcAngle, radius) {
        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Outside radius
        if (distance > radius) return false;

        // At origin (always hit)
        if (distance < 0.01) return true;

        // Calculate angle to target
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - direction;

        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) <= arcAngle / 2;
    },

    /**
     * Check if target is inside a beam/line segment with width
     * @param {number} targetX - Target X position (tiles)
     * @param {number} targetY - Target Y position (tiles)
     * @param {number} startX - Beam start X (tiles)
     * @param {number} startY - Beam start Y (tiles)
     * @param {number} endX - Beam end X (tiles)
     * @param {number} endY - Beam end Y (tiles)
     * @param {number} width - Beam width (tiles)
     * @returns {boolean} True if target is inside beam
     */
    isInsideBeam(targetX, targetY, startX, startY, endX, endY, width) {
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSq = dx * dx + dy * dy;

        // Zero-length beam
        if (lengthSq === 0) {
            const dist = Math.sqrt((targetX - startX) ** 2 + (targetY - startY) ** 2);
            return dist <= width / 2;
        }

        // Project target onto line, get parameter t (0-1 = on line segment)
        const t = Math.max(0, Math.min(1,
            ((targetX - startX) * dx + (targetY - startY) * dy) / lengthSq
        ));

        // Find closest point on line segment
        const projX = startX + t * dx;
        const projY = startY + t * dy;

        // Check distance from target to closest point
        const distSq = (targetX - projX) ** 2 + (targetY - projY) ** 2;
        return distSq <= (width / 2) ** 2;
    },

    /**
     * Check if target is inside an arc (ring segment)
     * Used for melee arcs with inner/outer radius
     * @param {number} targetX - Target X position (tiles)
     * @param {number} targetY - Target Y position (tiles)
     * @param {number} originX - Arc origin X (tiles)
     * @param {number} originY - Arc origin Y (tiles)
     * @param {number} direction - Direction the arc faces (radians)
     * @param {number} arcAngle - Total arc angle (radians)
     * @param {number} innerRadius - Inner radius (tiles), 0 for filled arc
     * @param {number} outerRadius - Outer radius (tiles)
     * @returns {boolean} True if target is inside arc
     */
    isInsideArc(targetX, targetY, originX, originY, direction, arcAngle, innerRadius, outerRadius) {
        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Outside outer radius or inside inner radius
        if (distance > outerRadius || distance < innerRadius) return false;

        // At origin with no inner radius (always hit)
        if (distance < 0.01 && innerRadius === 0) return true;

        // Calculate angle to target
        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - direction;

        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) <= arcAngle / 2;
    },

    /**
     * Check if target is inside a circle
     * @param {number} targetX - Target X position (tiles)
     * @param {number} targetY - Target Y position (tiles)
     * @param {number} centerX - Circle center X (tiles)
     * @param {number} centerY - Circle center Y (tiles)
     * @param {number} radius - Circle radius (tiles)
     * @returns {boolean} True if target is inside circle
     */
    isInsideCircle(targetX, targetY, centerX, centerY, radius) {
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        return (dx * dx + dy * dy) <= (radius * radius);
    },

    /**
     * Check if target is inside a rectangle (for charge/line attacks)
     * @param {number} targetX - Target X position (tiles)
     * @param {number} targetY - Target Y position (tiles)
     * @param {number} originX - Rectangle origin X (tiles)
     * @param {number} originY - Rectangle origin Y (tiles)
     * @param {number} direction - Direction the rectangle extends (radians)
     * @param {number} length - Rectangle length (tiles)
     * @param {number} width - Rectangle width (tiles)
     * @returns {boolean} True if target is inside rectangle
     */
    isInsideRectangle(targetX, targetY, originX, originY, direction, length, width) {
        // Translate target to rectangle's local coordinates
        const dx = targetX - originX;
        const dy = targetY - originY;

        // Rotate to align with rectangle
        const cos = Math.cos(-direction);
        const sin = Math.sin(-direction);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;

        // Check bounds (rectangle extends forward from origin)
        return localX >= 0 && localX <= length &&
               Math.abs(localY) <= width / 2;
    },

    /**
     * Calculate angle between two points
     * @returns {number} Angle in radians
     */
    angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * Calculate distance between two points
     * @returns {number} Distance
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Normalize angle to -PI to PI range
     * @param {number} angle - Angle in radians
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.GeometryUtils = GeometryUtils;
}
