// === js/core/game-state.js ===
// REFACTORED: Added decorations array for entity-based decoration system

let game = {
    state: 'menu',
    floor: 1,
    player: null,
    map: [],
    enemies: [],
    decorations: [],  // NEW: Decorations as separate entities (not tile mutations)
    merchant: null,
    camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
    exploredTiles: new Set(),
    inventoryTab: 0,
    skillsTab: 0, // 0 = Stats, 1 = Skills
    inspectIndex: 0,
    shiftMeter: 0,
    shiftActive: false,
    activeShift: null,
    shiftState: null,
    exitPosition: null,
    shiftCountdown: 600, // 10 minutes in seconds
    shiftLootMultiplier: 2.0, // Legendary drop chance multiplier during shift
    eruption: { timer: 180, lastDamage: 0 },
    keys: {},
    lastMoveTime: 0,
    moveDelay: 150,
    gold: 50,
    merchantVisited: false,
    doorways: [],
    lavaVents: [],
    lavaTiles: new Set(),
    rooms: [],
    timeAccumulator: 0,
    roomCount: 0,
    messageLog: [],
    lastMessageTime: 0,
    merchantMsg: "",
    levelUpData: null,
    groundLoot: []
};