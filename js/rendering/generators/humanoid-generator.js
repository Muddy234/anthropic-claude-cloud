// ============================================================================
// HUMANOID ANIMATION GENERATOR
// ============================================================================
// FK-skeleton animation generator for humanoid entities (player + enemies).
// Produces UV-map frames at 32x32 native resolution.
// Extracted from uv-map-prototype.html and adapted for production use.
//
// Architecture:
//   - Shape generators produce body part pixel grids (indices 0-7)
//   - Part definitions describe size, pivot, and shape for 10 body parts
//   - Identity texture layout packs all parts into a 32x32 atlas
//   - Per-direction bone trees define FK skeleton topology
//   - Animation cycles store per-frame bone angle deltas
//   - FK solver computes joint world positions
//   - UV-map generator maps each output pixel to identity texture coords
//   - Pre-computed UV frames are shared across all skins
// ============================================================================

(function() {
    'use strict';

    const SIZE = 32;

    // ========================================================================
    // SHAPE GENERATORS
    // ========================================================================
    // Each pixel: 0=transparent, 1=outline, 2=dark, 3=mid, 4=light,
    //             5=skin_dark, 6=skin_mid, 7=skin_light

    function makeOval(w, h) {
        const s = [];
        const cx = (w - 1) / 2, cy = (h - 1) / 2;
        const rx = w / 2 - 0.5, ry = h / 2 - 0.5;
        for (let y = 0; y < h; y++) {
            const row = [];
            for (let x = 0; x < w; x++) {
                const dx = (x - cx) / rx, dy = (y - cy) / ry;
                const d = dx * dx + dy * dy;
                if (d > 1.05) row.push(0);
                else if (d > 0.78) row.push(1);
                else if (dx < -0.25) row.push(2);
                else if (dx > 0.25) row.push(4);
                else row.push(3);
            }
            s.push(row);
        }
        return s;
    }

    function makeRect(w, h, roundness) {
        const s = [];
        const r = roundness || 0;
        for (let y = 0; y < h; y++) {
            const row = [];
            for (let x = 0; x < w; x++) {
                const nx = x / (w - 1), ny = y / (h - 1);
                let inside = true;
                if (r > 0) {
                    if (x < r && y < r && (r - x) * (r - x) + (r - y) * (r - y) > r * r) inside = false;
                    if (x >= w - r && y < r && (x - w + r + 1) * (x - w + r + 1) + (r - y) * (r - y) > r * r) inside = false;
                    if (x < r && y >= h - r && (r - x) * (r - x) + (y - h + r + 1) * (y - h + r + 1) > r * r) inside = false;
                    if (x >= w - r && y >= h - r && (x - w + r + 1) * (x - w + r + 1) + (y - h + r + 1) * (y - h + r + 1) > r * r) inside = false;
                }
                if (!inside) { row.push(0); continue; }
                const edge = (x === 0 || x === w - 1 || y === 0 || y === h - 1);
                const nearEdge = (x <= 1 || x >= w - 2 || y <= 1 || y >= h - 2);
                if (edge) row.push(1);
                else if (nearEdge) row.push(nx < 0.4 ? 2 : nx > 0.6 ? 4 : 3);
                else if (nx < 0.35) row.push(2);
                else if (nx > 0.65) row.push(4);
                else row.push(3);
            }
            s.push(row);
        }
        return s;
    }

    // Side-profile head (left-facing) - 7x8 (halved from 14x16 prototype)
    function makeHead() {
        return [
            [0, 1, 1, 1, 1, 1, 0],
            [1, 4, 3, 3, 3, 4, 1],
            [1, 7, 7, 7, 7, 3, 1],
            [1, 7, 6, 7, 7, 3, 1],
            [1, 7, 7, 7, 3, 3, 1],
            [0, 1, 3, 3, 3, 1, 0],
            [0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 7, 0, 0, 0],
        ];
    }

    // ========================================================================
    // PART DEFINITIONS (32x32 scale)
    // ========================================================================

    const PART_DEFS = {
        head:      { shape: makeHead(),         w: 7,  h: 8,  pivotX: 3, pivotY: 6 },
        torso:     { shape: makeRect(7, 8, 1),  w: 7,  h: 8,  pivotX: 3, pivotY: 1 },
        lUpperArm: { shape: makeOval(3, 5),     w: 3,  h: 5,  pivotX: 1, pivotY: 0 },
        lForearm:  { shape: makeOval(3, 5),     w: 3,  h: 5,  pivotX: 1, pivotY: 0 },
        rUpperArm: { shape: makeOval(3, 5),     w: 3,  h: 5,  pivotX: 1, pivotY: 0 },
        rForearm:  { shape: makeOval(3, 5),     w: 3,  h: 5,  pivotX: 1, pivotY: 0 },
        lThigh:    { shape: makeRect(4, 6, 1),  w: 4,  h: 6,  pivotX: 2, pivotY: 0 },
        lShin:     { shape: makeRect(3, 6, 1),  w: 3,  h: 6,  pivotX: 1, pivotY: 0 },
        rThigh:    { shape: makeRect(4, 6, 1),  w: 4,  h: 6,  pivotX: 2, pivotY: 0 },
        rShin:     { shape: makeRect(3, 6, 1),  w: 3,  h: 6,  pivotX: 1, pivotY: 0 },
    };

    // Identity texture layout: all 10 parts packed into 32x32
    const LAYOUT = {
        head:      { x: 0,  y: 0 },
        torso:     { x: 8,  y: 0 },
        lUpperArm: { x: 16, y: 0 },
        rUpperArm: { x: 20, y: 0 },
        lForearm:  { x: 24, y: 0 },
        rForearm:  { x: 28, y: 0 },
        lThigh:    { x: 0,  y: 9 },
        rThigh:    { x: 5,  y: 9 },
        lShin:     { x: 10, y: 9 },
        rShin:     { x: 14, y: 9 },
    };

    // ========================================================================
    // DIRECTION CONFIGURATIONS
    // ========================================================================

    // --- LEFT (side-view) ---
    const BONES_LEFT = [
        { name: 'spine',     parent: 'hip',       restAngle: -90, length: 6 },
        { name: 'neck',      parent: 'spine',     restAngle: 0,   length: 2 },
        { name: 'lUpperArm', parent: 'spine',     restAngle: 175, length: 4 },
        { name: 'lForearm',  parent: 'lUpperArm', restAngle: 5,   length: 4 },
        { name: 'rUpperArm', parent: 'spine',     restAngle: 175, length: 4 },
        { name: 'rForearm',  parent: 'rUpperArm', restAngle: 5,   length: 4 },
        { name: 'lThigh',    parent: 'hip',       restAngle: 90,  length: 5 },
        { name: 'lShin',     parent: 'lThigh',    restAngle: 0,   length: 5 },
        { name: 'rThigh',    parent: 'hip',       restAngle: 90,  length: 5 },
        { name: 'rShin',     parent: 'rThigh',    restAngle: 0,   length: 5 },
    ];

    const DIR_LEFT = {
        bones: BONES_LEFT,
        hipPos: { x: 16, y: 14 },
        zOrder: ['rUpperArm', 'rForearm', 'rThigh', 'rShin', 'torso', 'lThigh', 'lShin', 'lUpperArm', 'lForearm', 'head'],
        partJoints: {
            head: 'neck', torso: 'spine',
            lUpperArm: 'spine', lForearm: 'lUpperArm',
            rUpperArm: 'spine', rForearm: 'rUpperArm',
            lThigh: 'hip', lShin: 'lThigh',
            rThigh: 'hip', rShin: 'rThigh',
        },
        partAngleOffsets: {
            head: -180, torso: 0,
            lUpperArm: 0, lForearm: 0, rUpperArm: 0, rForearm: 0,
            lThigh: 0, lShin: 0, rThigh: 0, rShin: 0,
        },
    };

    // --- DOWN (front-facing) ---
    // Shoulder bones provide horizontal arm offset; they are structural only
    // (FK solver treats missing delta as 0, so they never appear in animation data)
    const BONES_DOWN = [
        { name: 'spine',      parent: 'hip',        restAngle: -90, length: 6 },
        { name: 'neck',       parent: 'spine',      restAngle: 0,   length: 2 },
        { name: 'shoulderL',  parent: 'spine',      restAngle: 180, length: 3 },
        { name: 'shoulderR',  parent: 'spine',      restAngle: 0,   length: 3 },
        { name: 'lUpperArm',  parent: 'shoulderL',  restAngle: 90,  length: 4 },
        { name: 'lForearm',   parent: 'lUpperArm',  restAngle: 0,   length: 4 },
        { name: 'rUpperArm',  parent: 'shoulderR',  restAngle: 90,  length: 4 },
        { name: 'rForearm',   parent: 'rUpperArm',  restAngle: 0,   length: 4 },
        { name: 'lThigh',     parent: 'hip',        restAngle: 80,  length: 5 },
        { name: 'lShin',      parent: 'lThigh',     restAngle: 10,  length: 5 },
        { name: 'rThigh',     parent: 'hip',        restAngle: 100, length: 5 },
        { name: 'rShin',      parent: 'rThigh',     restAngle: -10, length: 5 },
    ];

    const DIR_DOWN = {
        bones: BONES_DOWN,
        hipPos: { x: 16, y: 14 },
        zOrder: ['lUpperArm', 'lForearm', 'rUpperArm', 'rForearm', 'lThigh', 'lShin', 'rThigh', 'rShin', 'torso', 'head'],
        partJoints: {
            head: 'neck', torso: 'spine',
            lUpperArm: 'shoulderL', lForearm: 'lUpperArm',
            rUpperArm: 'shoulderR', rForearm: 'rUpperArm',
            lThigh: 'hip', lShin: 'lThigh',
            rThigh: 'hip', rShin: 'rThigh',
        },
        partAngleOffsets: {
            head: -180, torso: 0,
            lUpperArm: 0, lForearm: 0, rUpperArm: 0, rForearm: 0,
            lThigh: 0, lShin: 0, rThigh: 0, rShin: 0,
        },
    };

    // --- UP (back-facing) ---
    // Same bone tree as down, different z-order (head behind, back of torso visible)
    const DIR_UP = {
        bones: BONES_DOWN,
        hipPos: { x: 16, y: 14 },
        zOrder: ['head', 'torso', 'lUpperArm', 'lForearm', 'rUpperArm', 'rForearm', 'lThigh', 'lShin', 'rThigh', 'rShin'],
        partJoints: DIR_DOWN.partJoints,
        partAngleOffsets: DIR_DOWN.partAngleOffsets,
    };

    // ========================================================================
    // FK SOLVER
    // ========================================================================

    function solveFK(hipPos, bones, deltas) {
        const joints = {
            hip: { x: hipPos.x, y: hipPos.y, worldAngle: 0 }
        };

        for (const bone of bones) {
            const parent = joints[bone.parent];
            if (!parent) continue;
            const delta = deltas[bone.name] || 0;
            const localAngle = bone.restAngle + delta;
            const worldAngle = parent.worldAngle + localAngle;
            const rad = worldAngle * Math.PI / 180;

            joints[bone.name] = {
                x: parent.x + Math.cos(rad) * bone.length,
                y: parent.y + Math.sin(rad) * bone.length,
                worldAngle: worldAngle,
            };
        }

        return joints;
    }

    // ========================================================================
    // UV-MAP FRAME GENERATOR
    // ========================================================================

    function generateUVFrame(dirConfig, animFrame) {
        const hipPos = {
            x: dirConfig.hipPos.x,
            y: dirConfig.hipPos.y + (animFrame.hipDy || 0)
        };
        const joints = solveFK(hipPos, dirConfig.bones, animFrame);

        // UV map: each pixel stores source coords or null
        const uvMap = new Array(SIZE * SIZE).fill(null);

        for (const partName of dirConfig.zOrder) {
            const def = PART_DEFS[partName];
            const layout = LAYOUT[partName];
            const jointName = dirConfig.partJoints[partName];
            const joint = joints[jointName];
            if (!joint) continue;

            const boneWorldAngle = joint.worldAngle + (dirConfig.partAngleOffsets[partName] || 0);
            const rad = boneWorldAngle * Math.PI / 180;
            const cosA = Math.cos(rad);
            const sinA = Math.sin(rad);

            for (let py = 0; py < def.h; py++) {
                for (let px = 0; px < def.w; px++) {
                    if (!def.shape[py] || def.shape[py][px] === 0) continue;

                    const ox = px - def.pivotX;
                    const oy = py - def.pivotY;

                    const rx = ox * cosA - oy * sinA;
                    const ry = ox * sinA + oy * cosA;

                    const wx = Math.round(joint.x + rx);
                    const wy = Math.round(joint.y + ry);

                    if (wx >= 0 && wx < SIZE && wy >= 0 && wy < SIZE) {
                        uvMap[wy * SIZE + wx] = {
                            srcX: layout.x + px,
                            srcY: layout.y + py
                        };
                    }
                }
            }
        }

        return uvMap;
    }

    // ========================================================================
    // ANIMATION CYCLES
    // ========================================================================

    // Walk cycle - LEFT (side-view, 8 frames)
    const WALK_LEFT = [
        { lThigh: -22, lShin: 5,  rThigh: 22,  rShin: 0,  lUpperArm: 18,  lForearm: 8,  rUpperArm: -18, rForearm: -8,  spine: 2,  hipDy: 0 },
        { lThigh: -18, lShin: 10, rThigh: 18,  rShin: 8,  lUpperArm: 12,  lForearm: 5,  rUpperArm: -12, rForearm: -5,  spine: 1,  hipDy: 1 },
        { lThigh: -8,  lShin: 3,  rThigh: 5,   rShin: 25, lUpperArm: 5,   lForearm: 2,  rUpperArm: -5,  rForearm: -2,  spine: 0,  hipDy: 0 },
        { lThigh: 8,   lShin: 0,  rThigh: -12, rShin: 22, lUpperArm: -8,  lForearm: -4, rUpperArm: 8,   rForearm: 4,   spine: -1, hipDy: -1 },
        { lThigh: 22,  lShin: 0,  rThigh: -22, rShin: 5,  lUpperArm: -18, lForearm: -8, rUpperArm: 18,  rForearm: 8,   spine: -2, hipDy: 0 },
        { lThigh: 18,  lShin: 8,  rThigh: -18, rShin: 10, lUpperArm: -12, lForearm: -5, rUpperArm: 12,  rForearm: 5,   spine: -1, hipDy: 1 },
        { lThigh: 5,   lShin: 25, rThigh: -8,  rShin: 3,  lUpperArm: -5,  lForearm: -2, rUpperArm: 5,   rForearm: 2,   spine: 0,  hipDy: 0 },
        { lThigh: -12, lShin: 22, rThigh: 8,   rShin: 0,  lUpperArm: 8,   lForearm: 4,  rUpperArm: -8,  rForearm: -4,  spine: 1,  hipDy: -1 },
    ];

    // Walk cycle - DOWN (front-facing, 8 frames)
    // Shoulder bones omitted = implicit zero delta (structural only)
    const WALK_DOWN = [
        { lThigh: -12, lShin: 5,  rThigh: 12,  rShin: 0,  lUpperArm: 8,  lForearm: 5,  rUpperArm: -8, rForearm: -5, spine: 1,  hipDy: 0 },
        { lThigh: -10, lShin: 8,  rThigh: 10,  rShin: 5,  lUpperArm: 5,  lForearm: 3,  rUpperArm: -5, rForearm: -3, spine: 0,  hipDy: 1 },
        { lThigh: -5,  lShin: 3,  rThigh: 3,   rShin: 15, lUpperArm: 2,  lForearm: 1,  rUpperArm: -2, rForearm: -1, spine: 0,  hipDy: 0 },
        { lThigh: 5,   lShin: 0,  rThigh: -8,  rShin: 12, lUpperArm: -5, lForearm: -3, rUpperArm: 5,  rForearm: 3,  spine: -1, hipDy: 0 },
        { lThigh: 12,  lShin: 0,  rThigh: -12, rShin: 5,  lUpperArm: -8, lForearm: -5, rUpperArm: 8,  rForearm: 5,  spine: -1, hipDy: 0 },
        { lThigh: 10,  lShin: 5,  rThigh: -10, rShin: 8,  lUpperArm: -5, lForearm: -3, rUpperArm: 5,  rForearm: 3,  spine: 0,  hipDy: 1 },
        { lThigh: 3,   lShin: 15, rThigh: -5,  rShin: 3,  lUpperArm: -2, lForearm: -1, rUpperArm: 2,  rForearm: 1,  spine: 0,  hipDy: 0 },
        { lThigh: -8,  lShin: 12, rThigh: 5,   rShin: 0,  lUpperArm: 5,  lForearm: 3,  rUpperArm: -5, rForearm: -3, spine: 1,  hipDy: 0 },
    ];

    // Walk cycle - UP uses same angle data as down (visual difference from z-order)
    const WALK_UP = WALK_DOWN;

    // Idle cycle (single frame, all zeros)
    const IDLE_FRAME = { hipDy: 0 };

    // Attack cycle - LEFT (4 frames, non-looping)
    const ATTACK_LEFT = [
        { rUpperArm: -40, rForearm: -20, lUpperArm: 5, spine: -5, hipDy: 0 },
        { rUpperArm: 30,  rForearm: 15,  lUpperArm: -5, spine: 5, hipDy: 0 },
        { rUpperArm: 50,  rForearm: 25,  lUpperArm: -8, spine: 8, hipDy: 0 },
        { rUpperArm: 10,  rForearm: 5,   lUpperArm: 0,  spine: 2, hipDy: 0 },
    ];

    // Attack cycle - DOWN (4 frames)
    const ATTACK_DOWN = [
        { rUpperArm: -30, rForearm: -15, lUpperArm: 5, spine: -3, hipDy: 0 },
        { rUpperArm: 20,  rForearm: 10,  lUpperArm: -3, spine: 3, hipDy: 0 },
        { rUpperArm: 35,  rForearm: 18,  lUpperArm: -5, spine: 5, hipDy: 0 },
        { rUpperArm: 8,   rForearm: 3,   lUpperArm: 0,  spine: 1, hipDy: 0 },
    ];

    // Attack cycle - UP (4 frames)
    const ATTACK_UP = ATTACK_DOWN;

    // All cycles keyed by animation name and direction
    const ANIMATION_CYCLES = {
        walk: { left: WALK_LEFT, down: WALK_DOWN, up: WALK_UP },
        idle: { left: [IDLE_FRAME], down: [IDLE_FRAME], up: [IDLE_FRAME] },
        attack: { left: ATTACK_LEFT, down: ATTACK_DOWN, up: ATTACK_UP },
    };

    // Direction configs
    const DIR_CONFIGS = {
        left: DIR_LEFT,
        down: DIR_DOWN,
        up:   DIR_UP,
        // right: derived at runtime by flipping left frames horizontally
    };

    // ========================================================================
    // HUMANOID ANIMATION GENERATOR CLASS
    // ========================================================================

    function HumanoidAnimationGenerator() {
        // Pre-compute all UV frames for all directions and animation types
        this._uvFrames = {};

        for (const animName of Object.keys(ANIMATION_CYCLES)) {
            this._uvFrames[animName] = {};
            for (const dir of Object.keys(ANIMATION_CYCLES[animName])) {
                const frames = ANIMATION_CYCLES[animName][dir];
                const dirConfig = DIR_CONFIGS[dir];
                this._uvFrames[animName][dir] = frames.map(function(frame) {
                    return generateUVFrame(dirConfig, frame);
                });
            }
        }
    }

    HumanoidAnimationGenerator.prototype.getUVFrames = function(direction, animationType) {
        // Right direction uses left UV frames (flipped at render time)
        const lookupDir = (direction === 'right') ? 'left' : direction;
        const animFrames = this._uvFrames[animationType];
        if (!animFrames) return null;
        return animFrames[lookupDir] || null;
    };

    HumanoidAnimationGenerator.prototype.getFrameCount = function(animationType) {
        const cycle = ANIMATION_CYCLES[animationType];
        if (!cycle) return 0;
        // All directions have same frame count; use left as reference
        const leftFrames = cycle.left;
        return leftFrames ? leftFrames.length : 0;
    };

    HumanoidAnimationGenerator.prototype.getSize = function() {
        return SIZE;
    };

    HumanoidAnimationGenerator.prototype.isLooping = function(animationType) {
        return animationType !== 'attack';
    };

    /**
     * Build an identity texture (32x32 RGBA) for a given skin definition.
     * Skin format: { partName: { 1: '#hex', 2: '#hex', ... }, ... }
     */
    HumanoidAnimationGenerator.prototype.buildSkin = function(skinDef) {
        var data = new Uint8ClampedArray(SIZE * SIZE * 4);

        for (var partName in LAYOUT) {
            if (!LAYOUT.hasOwnProperty(partName)) continue;
            var layoutPos = LAYOUT[partName];
            var def = PART_DEFS[partName];
            var colors = skinDef[partName];
            if (!colors) continue;

            for (var py = 0; py < def.h; py++) {
                for (var px = 0; px < def.w; px++) {
                    var idx = def.shape[py] ? def.shape[py][px] : 0;
                    if (idx === 0) continue;

                    var hex = colors[idx];
                    if (!hex) continue;

                    var worldX = layoutPos.x + px;
                    var worldY = layoutPos.y + py;
                    if (worldX >= SIZE || worldY >= SIZE) continue;

                    var off = (worldY * SIZE + worldX) * 4;
                    data[off]     = parseInt(hex.slice(1, 3), 16);
                    data[off + 1] = parseInt(hex.slice(3, 5), 16);
                    data[off + 2] = parseInt(hex.slice(5, 7), 16);
                    data[off + 3] = 255;
                }
            }
        }

        return data;
    };

    /**
     * Render a single UV frame to an offscreen canvas.
     * Returns the canvas (32x32, 1:1 pixel).
     */
    HumanoidAnimationGenerator.prototype.renderFrameToCanvas = function(uvMap, identityData) {
        var canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        var imgData = ctx.createImageData(SIZE, SIZE);
        var pixels = imgData.data;

        for (var i = 0; i < SIZE * SIZE; i++) {
            var uv = uvMap[i];
            if (!uv) continue;

            var srcOff = (uv.srcY * SIZE + uv.srcX) * 4;
            var a = identityData[srcOff + 3];
            if (a === 0) continue;

            var dstOff = i * 4;
            pixels[dstOff]     = identityData[srcOff];
            pixels[dstOff + 1] = identityData[srcOff + 1];
            pixels[dstOff + 2] = identityData[srcOff + 2];
            pixels[dstOff + 3] = a;
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    };

    // ========================================================================
    // INSTANTIATE & REGISTER
    // ========================================================================

    var instance = new HumanoidAnimationGenerator();

    // Defensive registration
    if (typeof AnimationGeneratorRegistry !== 'undefined' && AnimationGeneratorRegistry.register) {
        AnimationGeneratorRegistry.register('humanoid', instance);
    } else {
        window.AnimationGeneratorRegistry = window.AnimationGeneratorRegistry || { _pending: [], _pendingMonsters: [] };
        window.AnimationGeneratorRegistry._pending = window.AnimationGeneratorRegistry._pending || [];
        window.AnimationGeneratorRegistry._pending.push({ name: 'humanoid', gen: instance });
    }

    window.HumanoidAnimationGenerator = HumanoidAnimationGenerator;

    console.log('[HumanoidGenerator] Loaded (32x32, 4 directions, walk/idle/attack)');
})();
