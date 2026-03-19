// === js/ui/tavern-games-ui.js ===
// Tavern mini-games - Dice of Fortune

// ============================================================================
// TAVERN GAMES UI
// ============================================================================

const TavernGamesUI = {

    // State
    active: false,
    currentGame: 'dice',  // Currently only dice
    gamePhase: 'betting',  // 'betting', 'rolling', 'result'

    // Dice game state
    betAmount: 25,
    playerDice: [0, 0, 0],
    houseDice: [0, 0, 0],
    playerTotal: 0,
    houseTotal: 0,
    playerTriple: false,
    houseTriple: false,
    lastWinnings: 0,
    rollAnimationFrame: 0,
    rollAnimationTimer: 0,

    // Betting options
    BET_OPTIONS: [10, 25, 50, 100],
    selectedBetIndex: 1,

    // Animation
    ROLL_DURATION: 1500,  // ms for roll animation
    ROLL_FRAMES: 12,

    // Layout
    PANEL_WIDTH: 500,
    PANEL_HEIGHT: 400,

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Open the tavern games UI
     */
    open() {
        this.active = true;
        this.gamePhase = 'betting';
        this.selectedBetIndex = 1;
        this.betAmount = this.BET_OPTIONS[this.selectedBetIndex];
        this.playerDice = [0, 0, 0];
        this.houseDice = [0, 0, 0];
        this.lastWinnings = 0;
        this.rollAnimationFrame = 0;
        this.rollAnimationTimer = 0;

        if (typeof game !== 'undefined') {
            game.state = GAME_STATES ? GAME_STATES.TAVERN_GAME : 'tavern_game';
        }
        console.log('[TavernGamesUI] Opened');
    },

    /**
     * Close the tavern games UI
     */
    close() {
        this.active = false;
        if (typeof game !== 'undefined') {
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
        }
        console.log('[TavernGamesUI] Closed');
    },

    // ========================================================================
    // GAME LOGIC
    // ========================================================================

    /**
     * Roll a single die
     * @returns {number} 1-6
     */
    _rollDie() {
        return Math.floor(Math.random() * 6) + 1;
    },

    /**
     * Calculate dice total and check for triple
     * @param {number[]} dice
     * @returns {{total: number, isTriple: boolean}}
     */
    _evaluateDice(dice) {
        const total = dice[0] + dice[1] + dice[2];
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
        return { total, isTriple };
    },

    /**
     * Start the dice roll
     */
    _startRoll() {
        const playerGold = this._getPlayerGold();
        if (playerGold < this.betAmount) {
            console.log('[TavernGamesUI] Not enough gold to bet');
            return;
        }

        // Deduct bet
        this._modifyPlayerGold(-this.betAmount);

        // Start rolling animation
        this.gamePhase = 'rolling';
        this.rollAnimationFrame = 0;
        this.rollAnimationTimer = 0;

        // Pre-determine results (revealed after animation)
        this.playerDice = [this._rollDie(), this._rollDie(), this._rollDie()];
        this.houseDice = [this._rollDie(), this._rollDie(), this._rollDie()];

        const playerEval = this._evaluateDice(this.playerDice);
        const houseEval = this._evaluateDice(this.houseDice);

        this.playerTotal = playerEval.total;
        this.houseTotal = houseEval.total;
        this.playerTriple = playerEval.isTriple;
        this.houseTriple = houseEval.isTriple;

        console.log(`[TavernGamesUI] Rolling - Player: ${this.playerDice} (${this.playerTotal}${this.playerTriple ? ' TRIPLE!' : ''}), House: ${this.houseDice} (${this.houseTotal}${this.houseTriple ? ' TRIPLE!' : ''})`);
    },

    /**
     * Determine winner and payout
     */
    _resolveGame() {
        let playerWins = false;
        let multiplier = 0;

        // Triple beats non-triple
        if (this.playerTriple && !this.houseTriple) {
            playerWins = true;
            multiplier = 3.0;  // Triple pays 3x
        } else if (!this.playerTriple && this.houseTriple) {
            playerWins = false;
        } else if (this.playerTriple && this.houseTriple) {
            // Both triples - higher triple wins
            playerWins = this.playerTotal > this.houseTotal;
            multiplier = playerWins ? 3.0 : 0;
        } else {
            // No triples - higher total wins
            if (this.playerTotal > this.houseTotal) {
                playerWins = true;
                multiplier = 1.8;
            } else if (this.playerTotal === this.houseTotal) {
                // Push - return bet
                multiplier = 1.0;
                playerWins = null;  // null = tie
            }
        }

        // Calculate winnings
        this.lastWinnings = Math.floor(this.betAmount * multiplier);
        if (this.lastWinnings > 0) {
            this._modifyPlayerGold(this.lastWinnings);
        }

        // Track stats
        this._trackStats(playerWins, this.lastWinnings - this.betAmount);

        this.gamePhase = 'result';
        console.log(`[TavernGamesUI] Result - ${playerWins === null ? 'TIE' : (playerWins ? 'WIN' : 'LOSE')} - Winnings: ${this.lastWinnings}`);
    },

    /**
     * Get player's current gold
     * @returns {number}
     */
    _getPlayerGold() {
        if (typeof game !== 'undefined' && game.player) {
            return game.player.gold || 0;
        }
        return 0;
    },

    /**
     * Modify player's gold
     * @param {number} amount - Positive to add, negative to subtract
     */
    _modifyPlayerGold(amount) {
        if (typeof game !== 'undefined' && game.player) {
            game.player.gold = (game.player.gold || 0) + amount;
        }
    },

    /**
     * Track game statistics
     * @param {boolean|null} won - true=win, false=lose, null=tie
     * @param {number} netGold - Net gold change
     */
    _trackStats(won, netGold) {
        if (typeof persistentState !== 'undefined') {
            if (!persistentState.stats) persistentState.stats = {};
            persistentState.stats.tavernGamesPlayed = (persistentState.stats.tavernGamesPlayed || 0) + 1;

            if (won === true) {
                persistentState.stats.tavernGamesWon = (persistentState.stats.tavernGamesWon || 0) + 1;
            }

            if (netGold > 0) {
                persistentState.stats.tavernGoldWon = (persistentState.stats.tavernGoldWon || 0) + netGold;
            } else if (netGold < 0) {
                persistentState.stats.tavernGoldLost = (persistentState.stats.tavernGoldLost || 0) + Math.abs(netGold);
            }
        }
    },

    /**
     * Reset for new game
     */
    _playAgain() {
        this.gamePhase = 'betting';
        this.playerDice = [0, 0, 0];
        this.houseDice = [0, 0, 0];
        this.lastWinnings = 0;
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update game state
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.active) return;

        // Handle roll animation
        if (this.gamePhase === 'rolling') {
            this.rollAnimationTimer += dt;

            // Update animation frame
            const frameTime = this.ROLL_DURATION / this.ROLL_FRAMES;
            this.rollAnimationFrame = Math.floor(this.rollAnimationTimer / frameTime);

            // Check if animation complete
            if (this.rollAnimationTimer >= this.ROLL_DURATION) {
                this._resolveGame();
            }
        }
    },

    // ========================================================================
    // INPUT HANDLING
    // ========================================================================

    /**
     * Handle keyboard input
     * @param {string} key
     */
    handleInput(key) {
        if (!this.active) return;

        switch (key) {
            case 'Escape':
                if (this.gamePhase === 'rolling') return;  // Can't close during roll
                this.close();
                break;

            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (this.gamePhase === 'betting') {
                    this.selectedBetIndex = Math.max(0, this.selectedBetIndex - 1);
                    this.betAmount = this.BET_OPTIONS[this.selectedBetIndex];
                }
                break;

            case 'ArrowRight':
            case 'd':
            case 'D':
                if (this.gamePhase === 'betting') {
                    this.selectedBetIndex = Math.min(this.BET_OPTIONS.length - 1, this.selectedBetIndex + 1);
                    this.betAmount = this.BET_OPTIONS[this.selectedBetIndex];
                }
                break;

            case 'Enter':
            case 'e':
            case 'E':
            case ' ':
                if (this.gamePhase === 'betting') {
                    this._startRoll();
                } else if (this.gamePhase === 'result') {
                    this._playAgain();
                }
                break;

            case '1':
            case '2':
            case '3':
            case '4':
                if (this.gamePhase === 'betting') {
                    const index = parseInt(key) - 1;
                    if (index < this.BET_OPTIONS.length) {
                        this.selectedBetIndex = index;
                        this.betAmount = this.BET_OPTIONS[this.selectedBetIndex];
                    }
                }
                break;
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the tavern games UI
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;
        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
            bgDark: '#141414',
            bgMedium: '#1c1c1c',
            frameGold: '#b8860b',
            frameGoldBright: '#daa520',
            frameGoldDark: '#8b6914',
            textPrimary: '#efe4b0',
            textSecondary: '#b8a878',
            textMuted: '#706850',
            boneWhite: '#f5f5dc',
            success: '#4a7c4e',
            error: '#8b3a3a'
        };

        // Darken background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Panel position
        const panelX = (canvas.width - this.PANEL_WIDTH) / 2;
        const panelY = (canvas.height - this.PANEL_HEIGHT) / 2;

        // Draw panel frame
        if (typeof drawTempleFrame === 'function') {
            drawTempleFrame(ctx, panelX, panelY, this.PANEL_WIDTH, this.PANEL_HEIGHT, {
                bgColor: colors.bgDark,
                frameColor: colors.frameGold,
                frameColorDark: colors.frameGoldDark,
                frameWidth: 5,
                cornerSize: 18,
                pattern: true,
                innerGlow: true
            });
        } else {
            ctx.fillStyle = colors.bgDark;
            ctx.fillRect(panelX, panelY, this.PANEL_WIDTH, this.PANEL_HEIGHT);
            ctx.strokeStyle = colors.frameGold;
            ctx.lineWidth = 3;
            ctx.strokeRect(panelX, panelY, this.PANEL_WIDTH, this.PANEL_HEIGHT);
        }

        // Title
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.title : 'bold 24px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.frameGoldBright;
        ctx.fillText('DICE OF FORTUNE', panelX + this.PANEL_WIDTH / 2, panelY + 35);

        // Subtitle - Rosie's game
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '12px Georgia, serif';
        ctx.fillStyle = colors.textMuted;
        ctx.fillText('"Roll the bones against ol\' Rosie!"', panelX + this.PANEL_WIDTH / 2, panelY + 55);

        // Player gold display
        const playerGold = this._getPlayerGold();
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = colors.textPrimary;
        ctx.fillText(`Your Gold: ${playerGold}`, panelX + 25, panelY + 85);

        // Render based on game phase
        switch (this.gamePhase) {
            case 'betting':
                this._renderBettingPhase(ctx, panelX, panelY, colors);
                break;
            case 'rolling':
                this._renderRollingPhase(ctx, panelX, panelY, colors);
                break;
            case 'result':
                this._renderResultPhase(ctx, panelX, panelY, colors);
                break;
        }

        // Close hint
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.tiny : '10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.textMuted;
        ctx.fillText('ESC to leave table', panelX + this.PANEL_WIDTH / 2, panelY + this.PANEL_HEIGHT - 15);
    },

    /**
     * Render betting phase
     * @private
     */
    _renderBettingPhase(ctx, panelX, panelY, colors) {
        const centerX = panelX + this.PANEL_WIDTH / 2;

        // Instructions
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText('Choose your wager:', centerX, panelY + 130);

        // Bet options
        const optionWidth = 70;
        const optionSpacing = 20;
        const totalWidth = this.BET_OPTIONS.length * optionWidth + (this.BET_OPTIONS.length - 1) * optionSpacing;
        let startX = centerX - totalWidth / 2;

        this.BET_OPTIONS.forEach((amount, index) => {
            const optX = startX + index * (optionWidth + optionSpacing);
            const optY = panelY + 150;
            const isSelected = index === this.selectedBetIndex;
            const canAfford = this._getPlayerGold() >= amount;

            // Button background
            if (typeof drawStoneButton === 'function') {
                drawStoneButton(ctx, optX, optY, optionWidth, 40, {
                    text: '',
                    isHovered: isSelected,
                    isDisabled: !canAfford
                });
            } else {
                ctx.fillStyle = !canAfford ? '#333' : (isSelected ? colors.frameGold : '#4a4a40');
                ctx.fillRect(optX, optY, optionWidth, 40);
                ctx.strokeStyle = isSelected ? colors.frameGoldBright : colors.frameGoldDark;
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.strokeRect(optX, optY, optionWidth, 40);
            }

            // Bet amount text
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = !canAfford ? colors.textMuted : (isSelected ? colors.boneWhite : colors.textSecondary);
            ctx.fillText(`${amount}g`, optX + optionWidth / 2, optY + 25);

            // Number hint
            ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.tiny : '10px Georgia, serif';
            ctx.fillStyle = colors.textMuted;
            ctx.fillText(`[${index + 1}]`, optX + optionWidth / 2, optY + 55);
        });

        // Roll button
        const rollBtnX = centerX - 75;
        const rollBtnY = panelY + 240;
        const canRoll = this._getPlayerGold() >= this.betAmount;

        if (typeof drawStoneButton === 'function') {
            drawStoneButton(ctx, rollBtnX, rollBtnY, 150, 50, {
                text: 'ROLL DICE',
                isHovered: true,
                isDisabled: !canRoll
            });
        } else {
            ctx.fillStyle = canRoll ? colors.frameGold : '#333';
            ctx.fillRect(rollBtnX, rollBtnY, 150, 50);
            ctx.strokeStyle = colors.frameGoldBright;
            ctx.lineWidth = 2;
            ctx.strokeRect(rollBtnX, rollBtnY, 150, 50);

            ctx.font = 'bold 16px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = canRoll ? colors.boneWhite : colors.textMuted;
            ctx.fillText('ROLL DICE', centerX, rollBtnY + 32);
        }

        // Rules reminder
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '11px Georgia, serif';
        ctx.fillStyle = colors.textMuted;
        ctx.fillText('Highest total wins. Triples beat any non-triple!', centerX, panelY + 320);
        ctx.fillText('Win: 1.8x  |  Triple: 3x  |  Tie: Push', centerX, panelY + 340);
    },

    /**
     * Render rolling animation phase
     * @private
     */
    _renderRollingPhase(ctx, panelX, panelY, colors) {
        const centerX = panelX + this.PANEL_WIDTH / 2;

        // Rolling text
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.heading : 'bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = colors.textPrimary;
        ctx.fillText('Rolling...', centerX, panelY + 130);

        // Animated dice (random values during animation)
        const diceY = panelY + 180;

        // Player dice
        ctx.fillStyle = colors.textSecondary;
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '12px Georgia, serif';
        ctx.fillText('Your Roll', centerX - 120, diceY - 15);

        for (let i = 0; i < 3; i++) {
            const diceX = centerX - 170 + i * 55;
            const animValue = Math.floor(Math.random() * 6) + 1;
            this._renderDie(ctx, diceX, diceY, animValue, colors);
        }

        // House dice
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText("Rosie's Roll", centerX + 120, diceY - 15);

        for (let i = 0; i < 3; i++) {
            const diceX = centerX + 50 + i * 55;
            const animValue = Math.floor(Math.random() * 6) + 1;
            this._renderDie(ctx, diceX, diceY, animValue, colors, true);
        }
    },

    /**
     * Render result phase
     * @private
     */
    _renderResultPhase(ctx, panelX, panelY, colors) {
        const centerX = panelX + this.PANEL_WIDTH / 2;

        // Show final dice
        const diceY = panelY + 150;

        // Player dice
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '12px Georgia, serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.textAlign = 'center';
        ctx.fillText('Your Roll', centerX - 120, diceY - 15);

        for (let i = 0; i < 3; i++) {
            const diceX = centerX - 170 + i * 55;
            this._renderDie(ctx, diceX, diceY, this.playerDice[i], colors);
        }

        // Player total
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.fillStyle = this.playerTriple ? colors.frameGoldBright : colors.textPrimary;
        ctx.fillText(`Total: ${this.playerTotal}${this.playerTriple ? ' TRIPLE!' : ''}`, centerX - 120, diceY + 65);

        // House dice
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.small : '12px Georgia, serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText("Rosie's Roll", centerX + 120, diceY - 15);

        for (let i = 0; i < 3; i++) {
            const diceX = centerX + 50 + i * 55;
            this._renderDie(ctx, diceX, diceY, this.houseDice[i], colors, true);
        }

        // House total
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.fillStyle = this.houseTriple ? '#cd5c5c' : colors.textPrimary;
        ctx.fillText(`Total: ${this.houseTotal}${this.houseTriple ? ' TRIPLE!' : ''}`, centerX + 120, diceY + 65);

        // Result message
        const resultY = panelY + 260;
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.title : 'bold 24px Georgia, serif';

        let resultText = '';
        let resultColor = colors.textPrimary;

        if (this.lastWinnings > this.betAmount) {
            resultText = `YOU WIN ${this.lastWinnings} GOLD!`;
            resultColor = colors.success || '#4a7c4e';
        } else if (this.lastWinnings === this.betAmount) {
            resultText = 'PUSH - Bet Returned';
            resultColor = colors.textSecondary;
        } else {
            resultText = 'HOUSE WINS';
            resultColor = colors.error || '#8b3a3a';
        }

        ctx.fillStyle = resultColor;
        ctx.fillText(resultText, centerX, resultY);

        // Play again prompt
        ctx.font = typeof UI_FONTS !== 'undefined' ? UI_FONTS.body : '14px Georgia, serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText('Press ENTER to play again', centerX, resultY + 50);
    },

    /**
     * Render a single die
     * @private
     */
    _renderDie(ctx, x, y, value, colors, isHouse = false) {
        const size = 45;

        // Die background
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        if (isHouse) {
            gradient.addColorStop(0, '#5a3a3a');
            gradient.addColorStop(1, '#3a2525');
        } else {
            gradient.addColorStop(0, '#f5f5dc');
            gradient.addColorStop(1, '#d4c896');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);

        // Die border
        ctx.strokeStyle = isHouse ? '#8b3a3a' : colors.frameGoldDark;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Pips
        ctx.fillStyle = isHouse ? '#f5f5dc' : '#1a1a1a';
        const pipSize = 6;
        const cx = x + size / 2;
        const cy = y + size / 2;
        const offset = 12;

        const pipPositions = {
            1: [[cx, cy]],
            2: [[cx - offset, cy - offset], [cx + offset, cy + offset]],
            3: [[cx - offset, cy - offset], [cx, cy], [cx + offset, cy + offset]],
            4: [[cx - offset, cy - offset], [cx + offset, cy - offset], [cx - offset, cy + offset], [cx + offset, cy + offset]],
            5: [[cx - offset, cy - offset], [cx + offset, cy - offset], [cx, cy], [cx - offset, cy + offset], [cx + offset, cy + offset]],
            6: [[cx - offset, cy - offset], [cx + offset, cy - offset], [cx - offset, cy], [cx + offset, cy], [cx - offset, cy + offset], [cx + offset, cy + offset]]
        };

        const positions = pipPositions[value] || [];
        positions.forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(px, py, pipSize / 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.TavernGamesUI = TavernGamesUI;

console.log('[TavernGamesUI] Tavern games UI loaded');
