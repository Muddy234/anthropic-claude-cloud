// === js/systems/core-system.js ===
// SURVIVAL EXTRACTION UPDATE: The Core encounter management

// ============================================================================
// CORE SYSTEM
// ============================================================================

const CoreSystem = {
    name: 'CoreSystem',
    priority: 95,

    // State
    isActive: false,
    arena: null,
    boss: null,
    phase: 0,
    encounterTime: 0,

    // Visual effects
    visualEffects: null,
    screenShake: 0,
    flashIntensity: 0,

    // UI state
    showingIntro: false,
    introProgress: 0,
    showingVictory: false,
    victoryProgress: 0,
    showingDefeat: false,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize core system
     */
    init() {
        this.isActive = false;
        this.arena = null;
        this.boss = null;
        console.log('[CoreSystem] Initialized');
    },

    // ========================================================================
    // ENCOUNTER MANAGEMENT
    // ========================================================================

    /**
     * Check if player can enter The Core
     * @returns {Object} { canEnter, reason }
     */
    canEnterCore() {
        return canAccessCore();
    },

    /**
     * Start The Core encounter
     * @returns {boolean} Success
     */
    startEncounter() {
        const accessCheck = this.canEnterCore();
        if (!accessCheck.canAccess) {
            if (typeof addMessage === 'function') {
                addMessage(accessCheck.reason, 'warning');
            }
            return false;
        }

        console.log('[CoreSystem] Starting Core encounter');

        // Generate arena
        this.arena = CoreGenerator.generate();
        this.visualEffects = CoreGenerator.createVisualEffects(this.arena.width, this.arena.height);

        // Spawn boss
        this.boss = createCoreBoss(this.arena.bossSpawn.x, this.arena.bossSpawn.y);

        // Set game state
        this.isActive = true;
        this.phase = 0;
        this.encounterTime = 0;
        this.showingIntro = true;
        this.introProgress = 0;

        // Consume Core Key
        if (typeof BankingSystem !== 'undefined') {
            BankingSystem.removeItem('core_key', 1);
        }

        // Move player to spawn
        if (gameState?.player) {
            gameState.player.x = this.arena.spawnPoint.x;
            gameState.player.y = this.arena.spawnPoint.y;
        }

        // Set game state to core
        if (typeof gameState !== 'undefined') {
            gameState.currentFloor = 7;  // Floor 7 = The Core
            gameState.inCore = true;
            gameState.map = this.arena.tiles;
            gameState.enemies = [];
        }

        // Track stats
        if (persistentState?.stats) {
            persistentState.stats.coreAttempts = (persistentState.stats.coreAttempts || 0) + 1;
        }

        return true;
    },

    /**
     * End the encounter (victory or defeat)
     * @param {boolean} victory
     */
    endEncounter(victory) {
        console.log(`[CoreSystem] Encounter ended: ${victory ? 'VICTORY' : 'DEFEAT'}`);

        if (victory) {
            this.showingVictory = true;
            this.victoryProgress = 0;
        } else {
            this.showingDefeat = true;
        }
    },

    /**
     * Handle boss defeated
     */
    onBossDefeated() {
        console.log('[CoreSystem] Boss defeated!');

        // Update stats
        if (persistentState?.stats) {
            persistentState.stats.coreCleared = true;
            persistentState.stats.coreClearTime = this.encounterTime;
            persistentState.stats.coreClearDate = Date.now();
        }

        this.endEncounter(true);
    },

    /**
     * Handle player death in Core
     */
    onPlayerDeath() {
        console.log('[CoreSystem] Player died in Core');

        // Core death is special - keep items, just respawn at village
        this.endEncounter(false);

        // Return to village after delay
        setTimeout(() => {
            this.returnToVillage();
        }, 5000);
    },

    /**
     * Return to village
     */
    returnToVillage() {
        this.isActive = false;
        this.arena = null;
        this.boss = null;
        this.showingVictory = false;
        this.showingDefeat = false;

        if (typeof gameState !== 'undefined') {
            gameState.inCore = false;
            gameState.currentState = 'village';
        }

        if (typeof VillageSystem !== 'undefined') {
            VillageSystem.init();
        }
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update core system
     * @param {number} dt - Delta time
     */
    update(dt) {
        if (!this.isActive) return;

        // Update intro sequence
        if (this.showingIntro) {
            this.introProgress += dt * 0.2;  // 5 second intro
            if (this.introProgress >= 1) {
                this.showingIntro = false;
                this.phase = 1;
                this._queueBossIntroDialogue();
            }
            return;
        }

        // Update victory sequence
        if (this.showingVictory) {
            this.victoryProgress += dt * 0.1;
            if (this.victoryProgress >= 1) {
                this._showVictoryScreen();
            }
            return;
        }

        // Update encounter time
        this.encounterTime += dt;

        // Update boss
        if (this.boss && this.boss.health > 0) {
            this.boss.update(dt, gameState.player, this.arena);
        }

        // Update visual effects
        this._updateVisualEffects(dt);

        // Update screen shake
        this.screenShake = Math.max(0, this.screenShake - dt * 5);

        // Update flash
        this.flashIntensity = Math.max(0, this.flashIntensity - dt * 3);

        // Check phase transitions
        this._checkPhaseEvents();
    },

    /**
     * Queue boss intro dialogue
     * @private
     */
    _queueBossIntroDialogue() {
        const dialogue = CORE_BOSS_DATA.phases[1].dialogue;
        dialogue.forEach(line => {
            if (typeof addMessage === 'function') {
                setTimeout(() => {
                    addMessage(`"${line}"`, 'boss');
                }, dialogue.indexOf(line) * 2000);
            }
        });
    },

    /**
     * Update visual effects
     * @param {number} dt
     * @private
     */
    _updateVisualEffects(dt) {
        if (!this.visualEffects) return;

        // Update particles
        this.visualEffects.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around
            if (p.x < 0) p.x = this.arena.width;
            if (p.x > this.arena.width) p.x = 0;
            if (p.y < 0) p.y = this.arena.height;
            if (p.y > this.arena.height) p.y = 0;
        });

        // Update fog patches
        this.visualEffects.fogPatches.forEach(fog => {
            fog.x += fog.driftX;
            fog.y += fog.driftY;

            // Wrap
            if (fog.x < -fog.radius) fog.x = this.arena.width + fog.radius;
            if (fog.x > this.arena.width + fog.radius) fog.x = -fog.radius;
            if (fog.y < -fog.radius) fog.y = this.arena.height + fog.radius;
            if (fog.y > this.arena.height + fog.radius) fog.y = -fog.radius;
        });
    },

    /**
     * Check for phase-specific events
     * @private
     */
    _checkPhaseEvents() {
        if (!this.boss) return;

        const currentPhase = this.boss.phase;

        // Phase 2 event: spawn extra hazards
        if (currentPhase >= 2 && this.phase < 2) {
            this.phase = 2;
            this._spawnPhaseHazards(2);
            this.screenShake = 1;
        }

        // Phase 3 event: arena changes
        if (currentPhase >= 3 && this.phase < 3) {
            this.phase = 3;
            this._spawnPhaseHazards(3);
            this.screenShake = 2;
            this.flashIntensity = 1;
        }
    },

    /**
     * Spawn hazards for phase
     * @param {number} phase
     * @private
     */
    _spawnPhaseHazards(phase) {
        if (!this.arena?.hazardSpawns) return;

        const hazardsToSpawn = phase === 2 ? 3 : 5;
        const spawns = [...this.arena.hazardSpawns].sort(() => Math.random() - 0.5);

        for (let i = 0; i < hazardsToSpawn && i < spawns.length; i++) {
            const spawn = spawns[i];
            const hazardType = phase === 2 ? 'void_rift' : 'chaos_pool';

            if (typeof HazardSystem !== 'undefined') {
                HazardSystem.addHazard({
                    ...CORE_HAZARDS[hazardType],
                    x: spawn.x,
                    y: spawn.y,
                    permanent: true
                });
            }
        }
    },

    /**
     * Show victory screen
     * @private
     */
    _showVictoryScreen() {
        // This would show credits/ending
        console.log('[CoreSystem] Showing victory screen');

        // Mark new game plus as unlocked
        if (persistentState) {
            persistentState.newGamePlusUnlocked = true;
        }

        // Show ending dialogue
        const ending = CORE_ENDINGS.victory;
        ending.dialogue.forEach((line, i) => {
            setTimeout(() => {
                if (typeof addMessage === 'function') {
                    addMessage(line, 'story');
                }
            }, i * 3000);
        });

        // Return to village after ending
        setTimeout(() => {
            this.returnToVillage();
            if (typeof addMessage === 'function') {
                addMessage('Congratulations! You have conquered The Chasm!', 'success');
                addMessage('New Game+ is now available!', 'success');
            }
        }, ending.dialogue.length * 3000 + 2000);
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render core-specific elements
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {number} offsetX
     * @param {number} offsetY
     * @param {number} tileSize
     */
    render(ctx, canvasWidth, canvasHeight, offsetX, offsetY, tileSize) {
        if (!this.isActive) return;

        // Render intro sequence
        if (this.showingIntro) {
            this._renderIntro(ctx, canvasWidth, canvasHeight);
            return;
        }

        // Render arena visual effects
        this._renderArenaEffects(ctx, offsetX, offsetY, tileSize);

        // Render boss
        if (this.boss) {
            this.boss.render(ctx, offsetX, offsetY, tileSize);
        }

        // Render safe zones (during primordial wrath)
        if (this.boss?.currentAbility?.id === 'primordial_wrath') {
            this._renderSafeZones(ctx, offsetX, offsetY, tileSize);
        }

        // Apply screen shake
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake * 10;
            const shakeY = (Math.random() - 0.5) * this.screenShake * 10;
            ctx.translate(shakeX, shakeY);
        }

        // Apply flash
        if (this.flashIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity * 0.5})`;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Render victory sequence
        if (this.showingVictory) {
            this._renderVictory(ctx, canvasWidth, canvasHeight);
        }

        // Render defeat screen
        if (this.showingDefeat) {
            this._renderDefeat(ctx, canvasWidth, canvasHeight);
        }

        // Render boss health bar (top of screen)
        if (this.boss && this.boss.health > 0 && !this.showingIntro) {
            this._renderBossHealthBar(ctx, canvasWidth);
        }

        // Render encounter timer
        this._renderTimer(ctx, canvasWidth);
    },

    /**
     * Render intro sequence
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @private
     */
    _renderIntro(ctx, canvasWidth, canvasHeight) {
        // Fade from black
        const fadeProgress = Math.min(1, this.introProgress * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - fadeProgress})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Title text
        if (this.introProgress > 0.3) {
            const textAlpha = Math.min(1, (this.introProgress - 0.3) * 2);
            ctx.fillStyle = `rgba(154, 74, 255, ${textAlpha})`;
            ctx.font = 'bold 48px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('THE CORE', canvasWidth / 2, canvasHeight / 2 - 50);

            ctx.fillStyle = `rgba(255, 74, 154, ${textAlpha})`;
            ctx.font = '24px monospace';
            ctx.fillText('Heart of the Chasm', canvasWidth / 2, canvasHeight / 2);
        }

        // Boss name reveal
        if (this.introProgress > 0.6) {
            const bossAlpha = Math.min(1, (this.introProgress - 0.6) * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${bossAlpha})`;
            ctx.font = 'bold 32px monospace';
            ctx.fillText('THE PRIMORDIAL', canvasWidth / 2, canvasHeight / 2 + 80);
        }
    },

    /**
     * Render arena visual effects
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} offsetX
     * @param {number} offsetY
     * @param {number} tileSize
     * @private
     */
    _renderArenaEffects(ctx, offsetX, offsetY, tileSize) {
        if (!this.visualEffects) return;

        // Render energy lines from center
        const centerX = (this.arena.width / 2) * tileSize - offsetX;
        const centerY = (this.arena.height / 2) * tileSize - offsetY;

        this.visualEffects.energyLines.forEach(line => {
            const pulse = Math.sin(this.encounterTime * 2 + line.pulseOffset) * 0.3 + 0.7;
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width * pulse;
            ctx.globalAlpha = 0.3 * pulse;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(
                centerX + Math.cos(line.angle) * line.length * tileSize,
                centerY + Math.sin(line.angle) * line.length * tileSize
            );
            ctx.stroke();
        });

        ctx.globalAlpha = 1;

        // Render particles
        this.visualEffects.particles.forEach(p => {
            const screenX = p.x * tileSize - offsetX;
            const screenY = p.y * tileSize - offsetY;

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;
    },

    /**
     * Render safe zones during primordial wrath
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} offsetX
     * @param {number} offsetY
     * @param {number} tileSize
     * @private
     */
    _renderSafeZones(ctx, offsetX, offsetY, tileSize) {
        if (!this.arena?.safeZones) return;

        const pulse = Math.sin(this.encounterTime * 8) * 0.3 + 0.7;

        this.arena.safeZones.forEach(zone => {
            const x = zone.x * tileSize - offsetX;
            const y = zone.y * tileSize - offsetY;
            const w = zone.width * tileSize;
            const h = zone.height * tileSize;

            // Safe zone highlight
            ctx.fillStyle = `rgba(0, 255, 0, ${0.3 * pulse})`;
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = `rgba(0, 255, 0, ${0.8 * pulse})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);

            // "SAFE" text
            ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SAFE', x + w / 2, y + h / 2 + 4);
        });
    },

    /**
     * Render boss health bar at top of screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @private
     */
    _renderBossHealthBar(ctx, canvasWidth) {
        const barWidth = canvasWidth * 0.6;
        const barHeight = 25;
        const barX = (canvasWidth - barWidth) / 2;
        const barY = 20;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPercent = this.boss.health / this.boss.maxHealth;
        const healthColor = this.boss.phase === 3 ? '#ff4444' :
                           this.boss.phase === 2 ? '#ffaa44' : '#44ff44';

        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Phase segments
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(barX + barWidth * 0.6, barY);
        ctx.lineTo(barX + barWidth * 0.6, barY + barHeight);
        ctx.moveTo(barX + barWidth * 0.25, barY);
        ctx.lineTo(barX + barWidth * 0.25, barY + barHeight);
        ctx.stroke();

        // Border
        ctx.strokeStyle = '#9a4aff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Boss name and phase
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.boss.name} - Phase ${this.boss.phase}`,
            canvasWidth / 2,
            barY + 17
        );

        // Health text
        ctx.fillStyle = '#aaa';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(
            `${Math.ceil(this.boss.health)} / ${this.boss.maxHealth}`,
            barX + barWidth - 5,
            barY - 5
        );
    },

    /**
     * Render encounter timer
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @private
     */
    _renderTimer(ctx, canvasWidth) {
        const minutes = Math.floor(this.encounterTime / 60);
        const seconds = Math.floor(this.encounterTime % 60);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(timeString, canvasWidth - 20, 15);
    },

    /**
     * Render victory screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @private
     */
    _renderVictory(ctx, canvasWidth, canvasHeight) {
        const alpha = Math.min(1, this.victoryProgress);

        // Background fade
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Victory text
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VICTORY', canvasWidth / 2, canvasHeight / 2 - 50);

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '20px monospace';
        ctx.fillText('The Primordial has been vanquished!', canvasWidth / 2, canvasHeight / 2 + 10);

        // Time
        const minutes = Math.floor(this.encounterTime / 60);
        const seconds = Math.floor(this.encounterTime % 60);
        ctx.fillStyle = `rgba(170, 170, 170, ${alpha})`;
        ctx.font = '16px monospace';
        ctx.fillText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`,
            canvasWidth / 2, canvasHeight / 2 + 60);
    },

    /**
     * Render defeat screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @private
     */
    _renderDefeat(ctx, canvasWidth, canvasHeight) {
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Defeat text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DEFEATED', canvasWidth / 2, canvasHeight / 2 - 50);

        ctx.fillStyle = '#aaa';
        ctx.font = '16px monospace';
        ctx.fillText('The Primordial\'s power was too great...', canvasWidth / 2, canvasHeight / 2 + 10);
        ctx.fillText('But your items are safe.', canvasWidth / 2, canvasHeight / 2 + 35);
        ctx.fillText('Returning to village...', canvasWidth / 2, canvasHeight / 2 + 70);
    },

    // ========================================================================
    // INPUT
    // ========================================================================

    /**
     * Handle input during core encounter
     * @param {string} key
     * @returns {boolean} Whether input was consumed
     */
    handleInput(key) {
        if (!this.isActive) return false;

        // Skip intro with any key
        if (this.showingIntro && this.introProgress > 0.5) {
            this.introProgress = 1;
            return true;
        }

        return false;
    }
};

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('CoreSystem', CoreSystem, 95);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CoreSystem = CoreSystem;

console.log('[CoreSystem] Core system loaded');
