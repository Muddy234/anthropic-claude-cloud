// === js/data/npcs.js ===
// NPC definitions and dialogue
// THE BLEEDING EARTH: Expanded NPC system with Elder Council

// ============================================================================
// NPC DATA
// ============================================================================

const NPC_DATA = {

    // ========================================================================
    // THE ELDER COUNCIL (Central to the narrative)
    // ========================================================================

    elder_mira: {
        id: 'elder_mira',
        name: 'Elder Mira',
        title: 'The Face of the Council',
        color: '#9370DB',
        description: 'The public leader of the village. Her eyes hold guilt.',
        building: 'town_square',
        role: 'quest_giver',
        dialogueTree: 'elder_mira_main',
        services: ['quests', 'lore', 'wards'],
        initialDialogue: 'elder_mira_intro',
        narrative: {
            personality: 'guilty',
            secret: 'She knows the truth about the Wards.',
            confrontation: 'Confesses everything when shown the dagger.'
        }
    },

    elder_thorne: {
        id: 'elder_thorne',
        name: 'Elder Thorne',
        title: 'The Greed',
        color: '#8B0000',
        description: 'A harsh, calculating man. He speaks of pragmatism, but his eyes count gold.',
        building: 'town_square',
        role: 'elder',
        dialogueTree: 'elder_thorne_main',
        services: ['lore'],
        initialDialogue: 'elder_thorne_intro',
        narrative: {
            personality: 'greedy',
            secret: 'He pushed for cracking the seal.',
            confrontation: 'Defiant. Claims it was necessary for the village.'
        }
    },

    elder_vallus: {
        id: 'elder_vallus',
        name: 'Elder Vallus',
        title: 'The Coward',
        color: '#4B0082',
        description: 'A nervous man who flinches at loud noises. He was once brave.',
        building: 'town_square',
        role: 'elder',
        dialogueTree: 'elder_vallus_main',
        services: ['lore'],
        initialDialogue: 'elder_vallus_intro',
        narrative: {
            personality: 'cowardly',
            secret: 'He killed the hero 100 years ago.',
            confrontation: 'Breaks down. Begs for forgiveness.'
        }
    },

    // Legacy alias for backward compatibility
    elder: {
        id: 'elder',
        name: 'Elder Mira',
        title: 'Village Elder',
        color: '#9370DB',
        description: 'A wise woman who has led the village for decades.',
        building: 'town_square',
        role: 'quest_giver',
        dialogueTree: 'elder_mira_main',
        services: ['quests', 'lore'],
        initialDialogue: 'elder_mira_intro',
        aliasOf: 'elder_mira'
    },

    // ========================================================================
    // CORE NPCs
    // ========================================================================

    banker: {
        id: 'banker',
        name: 'Grimwald',
        title: 'The Vault Keeper',
        color: '#FFD700',
        description: 'A stern dwarf who guards the village\'s vault with obsessive dedication.',
        building: 'bank',
        role: 'banker',
        dialogueTree: 'banker_main',
        services: ['bank', 'deposit', 'withdraw'],
        initialDialogue: 'banker_intro',
        barks: [
            '*counts coins* Business is good when delvers return...',
            'Every coin accounted for. Every. Single. One.',
            'The vault stands. As always.',
            'Interest compounds, friend. Remember that.',
            { condition: 'high_gold', text: 'Ah, a wealthy delver! The vault awaits.' },
            { condition: 'low_gold', text: 'Hmph. Empty pockets make poor customers.' }
        ]
    },

    blacksmith: {
        id: 'blacksmith',
        name: 'Tormund',
        title: 'Master Smith',
        color: '#FF6347',
        description: 'A burly man with arms like tree trunks. The best smith in the region.',
        building: 'smithy',
        role: 'merchant',
        dialogueTree: 'smith_main',
        services: ['shop', 'repair', 'craft'],
        inventory: 'blacksmith_stock',
        initialDialogue: 'smith_intro',
        barks: [
            '*hammer rings* Fine steel, forged strong!',
            'That blade\'s seen better days. Come see me!',
            'Nothing beats dwarven steel. Nothing.',
            '*wipes brow* Honest work for honest pay.',
            { condition: 'recent_death', text: 'Back from the depths? Need repairs, I wager.' },
            { condition: 'deep_diver', text: 'A veteran! Your blade must have stories to tell.' },
            { condition: 'many_runs', text: 'Heard you\'ve been busy down there!' }
        ]
    },

    innkeeper: {
        id: 'innkeeper',
        name: 'Rosie',
        title: 'The Weary Delver\'s Owner',
        color: '#DEB887',
        description: 'A cheerful woman who runs the tavern. Knows every rumor worth knowing.',
        building: 'tavern',
        role: 'innkeeper',
        dialogueTree: 'innkeeper_main',
        services: ['rest', 'rumors', 'quests', 'dice_game'],
        initialDialogue: 'innkeeper_intro',
        barks: [
            '*hums a tune* Ale\'s fresh today!',
            'Come for the drinks, stay for the stories!',
            'Heard the latest? Come closer...',
            '*polishes glass* Slow day, huh?',
            { condition: 'first_run', text: 'New face! Welcome to the Delver!' },
            { condition: 'recent_death', text: 'Rough day? A drink might help.' },
            { condition: 'high_gold', text: 'Looking prosperous! Feeling lucky at dice?' }
        ]
    },

    expedition_master: {
        id: 'expedition_master',
        name: 'Captain Valdris',
        title: 'Expedition Master',
        color: '#4682B4',
        description: 'A retired delver who now coordinates expeditions into the Chasm.',
        building: 'expedition_hall',
        role: 'loadout',
        dialogueTree: 'expedition_main',
        services: ['loadout', 'stats'],
        initialDialogue: 'expedition_intro',
        barks: [
            '*checks ledger* Another day, another descent.',
            'Preparation is everything. Remember that.',
            'The Chasm waits for no one.',
            '*adjusts gear* Ready when you are, delver.',
            { condition: 'deep_diver', text: 'Impressive depth record. Keep pushing.' },
            { condition: 'first_run', text: 'Nervous? Good. Fear keeps you alive.' },
            { condition: 'many_runs', text: 'Veteran in the making. Respect.' },
            { condition: 'bounty_active', text: 'Got contracts to fulfill? Best get moving.' }
        ]
    },

    priestess: {
        id: 'priestess',
        name: 'Sister Celeste',
        title: 'Keeper of the Shrine',
        color: '#E6E6FA',
        description: 'A serene priestess who tends the village shrine.',
        building: 'shrine',
        role: 'healer',
        dialogueTree: 'priestess_main',
        services: ['heal', 'blessings', 'lore'],
        initialDialogue: 'priestess_intro',
        barks: [
            '*softly praying* The light guides...',
            'Peace be upon you, traveler.',
            'The shrine\'s flame burns eternal.',
            '*tends candles* Darkness cannot extinguish hope.',
            { condition: 'low_health', text: 'You are wounded. Let me help.' },
            { condition: 'recent_death', text: 'You\'ve seen darkness. Find solace here.' },
            { condition: 'deep_diver', text: 'The deeper you go, the more the light matters.' }
        ]
    },

    // ========================================================================
    // SECONDARY NPCs
    // ========================================================================

    patron: {
        id: 'patron',
        name: 'Old Garrett',
        title: 'Veteran Delver',
        color: '#8B8989',
        description: 'A grizzled veteran who spends his days drinking and sharing stories.',
        building: 'tavern',
        role: 'tips',
        dialogueTree: 'patron_main',
        services: ['tips', 'stories'],
        initialDialogue: 'patron_intro',
        barks: [
            '*sips ale* Back in my day...',
            'The Chasm takes more than it gives.',
            '*mutters* ...deeper... always deeper...',
            'Trust your instincts down there.',
            { condition: 'first_run', text: 'Fresh meat for the Chasm, eh?' },
            { condition: 'deep_diver', text: '*nods approvingly* You\'ve got the look of a survivor.' },
            { condition: 'recent_death', text: 'We all kiss the stone eventually. Get back up.' }
        ]
    },

    // ========================================================================
    // WORLD STATE CONDITIONAL NPCs
    // ========================================================================

    alchemist: {
        id: 'alchemist',
        name: 'Zephyr',
        title: 'Wandering Alchemist',
        color: '#00CED1',
        description: 'A mysterious figure who deals in potions and rare materials.',
        building: 'smithy',  // Near the smithy
        role: 'merchant',
        dialogueTree: 'alchemist_main',
        services: ['shop', 'craft'],
        inventory: 'alchemist_stock',
        unlockCondition: { runs: 5 },
        initialDialogue: 'alchemist_intro',
        // THE BLEEDING EARTH: Flees when burning state reached
        worldStatePresence: {
            presentUntil: 3,  // BURNING
            fleeState: 3,
            fleeDialogue: 'alchemist_farewell',
            replacement: {
                type: 'object',
                name: 'Leftover Potion Crate',
                services: ['shop'],
                inventory: 'alchemist_emergency_stock'
            }
        }
    },

    merchant_wife: {
        id: 'merchant_wife',
        name: 'Helena',
        title: 'Merchant\'s Wife',
        color: '#DDA0DD',
        description: 'A worried mother of three. She helps her husband run the general store.',
        building: 'tavern',  // Often at tavern
        role: 'ambient',
        dialogueTree: 'merchant_wife_main',
        services: [],
        initialDialogue: 'merchant_wife_intro',
        worldStatePresence: {
            presentUntil: 2,  // ASH
            fleeState: 2,
            fleeDialogue: 'merchant_wife_farewell'
        }
    },

    // Ambient villagers (flee early)
    villager_1: {
        id: 'villager_1',
        name: 'Farmer Jeb',
        title: 'Local Farmer',
        color: '#8B4513',
        description: 'A weathered farmer who tends the fields outside town.',
        building: null,  // Wanders
        role: 'ambient',
        dialogueTree: 'villager_generic',
        services: [],
        worldStatePresence: {
            presentUntil: 2,
            fleeState: 2
        }
    },

    villager_2: {
        id: 'villager_2',
        name: 'Martha',
        title: 'Baker',
        color: '#DEB887',
        description: 'The village baker. Her bread is legendary.',
        building: null,
        role: 'ambient',
        dialogueTree: 'villager_generic',
        services: [],
        worldStatePresence: {
            presentUntil: 2,
            fleeState: 2
        }
    },

    villager_3: {
        id: 'villager_3',
        name: 'Young Thomas',
        title: 'Apprentice',
        color: '#6495ED',
        description: 'A young man learning the smith trade.',
        building: 'smithy',
        role: 'ambient',
        dialogueTree: 'villager_generic',
        services: [],
        worldStatePresence: {
            presentUntil: 2,
            fleeState: 2
        }
    },

    scout: {
        id: 'scout',
        name: 'Swift',
        title: 'Chasm Scout',
        color: '#32CD32',
        description: 'A nimble scout who maps the ever-changing Chasm.',
        building: 'expedition_hall',
        role: 'info',
        dialogueTree: 'scout_main',
        services: ['maps'],
        unlockCondition: { floor_reached: 3 },
        initialDialogue: 'scout_intro'
    }
};

// ============================================================================
// NPC WORLD STATE HELPERS
// ============================================================================

/**
 * Check if an NPC should be present based on world state
 * @param {string} npcId - NPC ID
 * @returns {boolean}
 */
function isNPCPresentInWorldState(npcId) {
    const npc = NPC_DATA[npcId];
    if (!npc) return false;

    // Check WorldStateSystem first
    if (typeof WorldStateSystem !== 'undefined') {
        const npcState = WorldStateSystem.getNPCState(npcId);
        if (npcState === 'fled' || npcState === 'dead') {
            return false;
        }
    }

    // Check world state presence rules
    if (npc.worldStatePresence) {
        const currentState = typeof WorldStateSystem !== 'undefined' ?
            WorldStateSystem.getState() : 1;

        if (currentState >= npc.worldStatePresence.presentUntil) {
            return false;
        }
    }

    return true;
}

/**
 * Get NPC's replacement (if any) for current world state
 * @param {string} npcId
 * @returns {Object|null}
 */
function getNPCReplacement(npcId) {
    const npc = NPC_DATA[npcId];
    if (!npc?.worldStatePresence?.replacement) return null;

    if (!isNPCPresentInWorldState(npcId)) {
        return npc.worldStatePresence.replacement;
    }
    return null;
}

// ============================================================================
// DIALOGUE TREES
// ============================================================================

const DIALOGUE_TREES = {

    // ========================================================================
    // ELDER MIRA
    // ========================================================================

    elder_intro: {
        speaker: 'elder',
        text: 'Welcome, delver. I am Elder Mira. The village survives because brave souls like you venture into the Chasm.',
        responses: [
            { text: 'What is the Chasm?', next: 'elder_chasm_lore' },
            { text: 'What do you need from me?', next: 'elder_quests' },
            { text: 'I should go.', action: 'close' }
        ]
    },

    elder_main: {
        speaker: 'elder',
        text: 'The Chasm grows more restless. What brings you to me?',
        responses: [
            { text: 'Tell me about the Chasm.', next: 'elder_chasm_lore' },
            { text: 'Do you have any tasks for me?', next: 'elder_quests' },
            { text: 'How is the village?', next: 'elder_village_status' },
            { text: 'Farewell.', action: 'close' }
        ]
    },

    elder_chasm_lore: {
        speaker: 'elder',
        text: 'The Shifting Chasm appeared decades ago. It consumes everything - land, resources, lives. But it also gives. Strange materials, ancient artifacts. We survive by taking what we can before it shifts.',
        responses: [
            { text: 'What causes the shifting?', next: 'elder_shifting_lore' },
            { text: 'I understand.', next: 'elder_main' }
        ]
    },

    elder_shifting_lore: {
        speaker: 'elder',
        text: 'None know for certain. Some say it\'s alive. Others claim something at the Core controls it. All we know is this: when the ground begins to tremble, you must escape or descend. There is no standing still.',
        responses: [
            { text: 'The Core?', next: 'elder_core_lore' },
            { text: 'I\'ll be careful.', next: 'elder_main' }
        ]
    },

    elder_core_lore: {
        speaker: 'elder',
        text: 'Six floors down lies something... ancient. The Core. No one has ever returned from there. Perhaps you will be the first.',
        responses: [
            { text: 'I will try.', next: 'elder_main' },
            { text: 'That sounds dangerous.', next: 'elder_main' }
        ]
    },

    elder_quests: {
        speaker: 'elder',
        text: 'The village always needs resources from the Chasm. Speak with me when you\'re ready to take on a task.',
        action: 'show_quests',
        responses: [
            { text: 'What else can you tell me?', next: 'elder_main' },
            { text: 'I\'ll return when ready.', action: 'close' }
        ]
    },

    elder_village_status: {
        speaker: 'elder',
        text: 'The village endures, as it always has. Your contributions help keep us safe.',
        dynamic: 'village_status',
        responses: [
            { text: 'Good to hear.', next: 'elder_main' }
        ]
    },

    // ========================================================================
    // BANKER GRIMWALD
    // ========================================================================

    banker_intro: {
        speaker: 'banker',
        text: '*The dwarf looks up from a ledger* Another delver seeking to store their treasures? I am Grimwald. The Vault is secure - nothing you deposit here will be lost.',
        responses: [
            { text: 'I\'d like to access my vault.', action: 'open_bank' },
            { text: 'How does the vault work?', next: 'banker_explain' },
            { text: 'Maybe later.', action: 'close' }
        ]
    },

    banker_main: {
        speaker: 'banker',
        text: '*adjusts spectacles* The Vault awaits. What do you need?',
        responses: [
            { text: 'Open my vault.', action: 'open_bank' },
            { text: 'How much do I have stored?', next: 'banker_balance' },
            { text: 'Nothing for now.', action: 'close' }
        ]
    },

    banker_explain: {
        speaker: 'banker',
        text: 'Deposit items here before a run to keep them safe. If you die in the Chasm, anything in your pockets is lost. But the Vault? The Vault remembers.',
        responses: [
            { text: 'Open my vault.', action: 'open_bank' },
            { text: 'I understand.', next: 'banker_main' }
        ]
    },

    banker_balance: {
        speaker: 'banker',
        dynamic: 'bank_balance',
        responses: [
            { text: 'Open my vault.', action: 'open_bank' },
            { text: 'Thank you.', next: 'banker_main' }
        ]
    },

    // ========================================================================
    // BLACKSMITH TORMUND
    // ========================================================================

    smith_intro: {
        speaker: 'blacksmith',
        text: '*wipes sweat from brow* Fresh meat for the Chasm, eh? I\'m Tormund. I forge the weapons that keep delvers alive. Need something sharp?',
        responses: [
            { text: 'Show me what you have.', action: 'open_shop' },
            { text: 'Can you repair my equipment?', next: 'smith_repair' },
            { text: 'Just looking.', action: 'close' }
        ]
    },

    smith_main: {
        speaker: 'blacksmith',
        text: '*hammers cooling* What can I forge for you today?',
        responses: [
            { text: 'Browse your wares.', action: 'open_shop' },
            { text: 'Repair my gear.', next: 'smith_repair' },
            { text: 'Can you craft something special?', next: 'smith_craft' },
            { text: 'Nothing today.', action: 'close' }
        ]
    },

    smith_repair: {
        speaker: 'blacksmith',
        text: 'Repair? Ha! My weapons don\'t break easily. But bring me materials from the Chasm, and I can improve what you have.',
        responses: [
            { text: 'What materials do you need?', next: 'smith_materials' },
            { text: 'I\'ll find some.', next: 'smith_main' }
        ]
    },

    smith_materials: {
        speaker: 'blacksmith',
        text: 'Chasm Iron for basic work. Emberstone for fire enchantments. Shadow Ore for... darker purposes. Find them deep.',
        responses: [
            { text: 'I\'ll look for them.', next: 'smith_main' },
            { text: 'Show me your shop.', action: 'open_shop' }
        ]
    },

    smith_craft: {
        speaker: 'blacksmith',
        text: 'Special orders require special materials. Bring me what you find in the Chasm, and we\'ll talk.',
        action: 'open_crafting',
        responses: [
            { text: 'I\'ll see what I can find.', next: 'smith_main' }
        ]
    },

    // ========================================================================
    // INNKEEPER ROSIE
    // ========================================================================

    innkeeper_intro: {
        speaker: 'innkeeper',
        text: '*smiles warmly* Welcome to The Weary Delver! I\'m Rosie. You look like you could use a drink and some news.',
        responses: [
            { text: 'What\'s the latest news?', next: 'innkeeper_rumors' },
            { text: 'Care for a game of dice?', next: 'innkeeper_dice_intro' },
            { text: 'I need to rest.', next: 'innkeeper_rest' },
            { text: 'Just passing through.', action: 'close' }
        ]
    },

    innkeeper_main: {
        speaker: 'innkeeper',
        text: '*polishes a glass* Good to see you back! What can I get you?',
        responses: [
            { text: 'Any new rumors?', next: 'innkeeper_rumors' },
            { text: 'How about a game of dice?', next: 'innkeeper_dice' },
            { text: 'I need rest.', next: 'innkeeper_rest' },
            { text: 'Nothing for now.', action: 'close' }
        ]
    },

    innkeeper_rumors: {
        speaker: 'innkeeper',
        dynamic: 'random_rumor',
        responses: [
            { text: 'Interesting...', next: 'innkeeper_main' },
            { text: 'Tell me more.', next: 'innkeeper_rumors_2' },
            { text: 'Thanks for the info.', action: 'close' }
        ]
    },

    innkeeper_rumors_2: {
        speaker: 'innkeeper',
        dynamic: 'random_rumor',
        responses: [
            { text: 'Thanks, Rosie.', next: 'innkeeper_main' }
        ]
    },

    innkeeper_rest: {
        speaker: 'innkeeper',
        text: 'Rest? In the village? *laughs* The Chasm doesn\'t tire you here, dear. But if you want to sit and think about your next dive, I won\'t stop you.',
        responses: [
            { text: 'Good point.', next: 'innkeeper_main' }
        ]
    },

    innkeeper_dice_intro: {
        speaker: 'innkeeper',
        text: '*produces a worn leather cup* Ah, a gambler! The game is Dice of Fortune - we each roll three bones. Highest total wins. But watch out for triples - they beat everything! You in?',
        responses: [
            { text: 'Let\'s roll!', action: 'open_dice_game' },
            { text: 'What are the stakes?', next: 'innkeeper_dice_stakes' },
            { text: 'Maybe another time.', next: 'innkeeper_main' }
        ]
    },

    innkeeper_dice: {
        speaker: 'innkeeper',
        text: '*rattles the dice cup* Ready for another round? Lady luck\'s been fickle today...',
        responses: [
            { text: 'Deal me in!', action: 'open_dice_game' },
            { text: 'What are the rules again?', next: 'innkeeper_dice_stakes' },
            { text: 'I\'ll pass for now.', next: 'innkeeper_main' }
        ]
    },

    innkeeper_dice_stakes: {
        speaker: 'innkeeper',
        text: 'Standard bets are 10, 25, 50, or 100 gold. Win and you get 1.8 times your bet back. Roll a triple? That pays triple! Ties push - you get your bet back. Fair odds, I promise.',
        responses: [
            { text: 'Sounds good. Let\'s play!', action: 'open_dice_game' },
            { text: 'I\'ll think about it.', next: 'innkeeper_main' }
        ]
    },

    // ========================================================================
    // EXPEDITION MASTER VALDRIS
    // ========================================================================

    expedition_intro: {
        speaker: 'expedition_master',
        text: '*stands at attention* Delver. I am Captain Valdris. Before you enter the Chasm, you prepare here. Choose your loadout wisely.',
        responses: [
            { text: 'I\'m ready to dive.', action: 'open_loadout' },
            { text: 'What are my stats?', next: 'expedition_stats' },
            { text: 'Not yet.', action: 'close' }
        ]
    },

    expedition_main: {
        speaker: 'expedition_master',
        text: 'Ready for another descent?',
        responses: [
            { text: 'Prepare my loadout.', action: 'open_loadout' },
            { text: 'Show my stats.', next: 'expedition_stats' },
            { text: 'Not now.', action: 'close' }
        ]
    },

    expedition_stats: {
        speaker: 'expedition_master',
        dynamic: 'player_stats',
        responses: [
            { text: 'Impressive.', next: 'expedition_main' },
            { text: 'I can do better.', next: 'expedition_main' }
        ]
    },

    // ========================================================================
    // PRIESTESS CELESTE
    // ========================================================================

    priestess_intro: {
        speaker: 'priestess',
        text: '*bows gently* Blessings upon you, traveler. I am Sister Celeste. The Light watches over all who venture into darkness.',
        responses: [
            { text: 'Can you heal me?', next: 'priestess_heal' },
            { text: 'Tell me about the Light.', next: 'priestess_lore' },
            { text: 'Thank you, Sister.', action: 'close' }
        ]
    },

    priestess_main: {
        speaker: 'priestess',
        text: '*smiles serenely* How may I serve?',
        responses: [
            { text: 'I seek healing.', next: 'priestess_heal' },
            { text: 'Grant me a blessing.', next: 'priestess_blessing' },
            { text: 'Tell me of the shrine.', next: 'priestess_lore' },
            { text: 'Farewell.', action: 'close' }
        ]
    },

    priestess_heal: {
        speaker: 'priestess',
        text: 'In the village, your body is whole. The Chasm\'s wounds do not follow you here. But take this blessing for your next journey.',
        action: 'grant_blessing',
        responses: [
            { text: 'Thank you, Sister.', action: 'close' }
        ]
    },

    priestess_blessing: {
        speaker: 'priestess',
        text: '*traces a symbol in the air* May the Light guide your steps and shield you from the darkness below.',
        action: 'grant_blessing',
        responses: [
            { text: 'I am grateful.', action: 'close' }
        ]
    },

    priestess_lore: {
        speaker: 'priestess',
        text: 'This shrine has stood since before the Chasm. Some say its light is what keeps the Chasm from consuming the village entirely.',
        responses: [
            { text: 'Interesting...', next: 'priestess_main' }
        ]
    },

    // ========================================================================
    // PATRON OLD GARRETT
    // ========================================================================

    patron_intro: {
        speaker: 'patron',
        text: '*raises mug* Hah! Another young fool heading into the hole. Sit down, I\'ll tell you what you need to know.',
        responses: [
            { text: 'What tips do you have?', next: 'patron_tips' },
            { text: 'Tell me a story.', next: 'patron_story' },
            { text: 'Maybe later, old timer.', action: 'close' }
        ]
    },

    patron_main: {
        speaker: 'patron',
        text: '*burps* Back again? Good, you\'re still alive. What do you want to know?',
        responses: [
            { text: 'Any advice?', next: 'patron_tips' },
            { text: 'Tell me another story.', next: 'patron_story' },
            { text: 'Nothing, thanks.', action: 'close' }
        ]
    },

    patron_tips: {
        speaker: 'patron',
        dynamic: 'random_tip',
        responses: [
            { text: 'Thanks for the tip.', next: 'patron_main' },
            { text: 'Got any more?', next: 'patron_tips_2' }
        ]
    },

    patron_tips_2: {
        speaker: 'patron',
        dynamic: 'random_tip',
        responses: [
            { text: 'I\'ll remember that.', next: 'patron_main' }
        ]
    },

    patron_story: {
        speaker: 'patron',
        dynamic: 'random_story',
        responses: [
            { text: 'Fascinating.', next: 'patron_main' },
            { text: 'You\'re making that up.', next: 'patron_defend' }
        ]
    },

    patron_defend: {
        speaker: 'patron',
        text: '*slams mug* I\'ve seen things down there that would turn your hair white! You\'ll learn... if you survive.',
        responses: [
            { text: 'Alright, alright.', next: 'patron_main' }
        ]
    }
};

// ============================================================================
// DYNAMIC DIALOGUE CONTENT
// ============================================================================

const DYNAMIC_DIALOGUE = {

    random_rumor: [
        'I heard there\'s a new passage on floor three. Leads to a treasure room... or a death trap.',
        'Some say there\'s a hidden merchant deep in the Chasm. Sells things you can\'t get here.',
        'The beasts on floor five are getting more aggressive. Something\'s stirring them up.',
        'A delver came back yesterday raving about "living shadows." She hasn\'t spoken since.'
    ],

    random_tip: [
        'The deeper you go, the better the loot. But the dangers multiply.',
        'Always keep an escape route in mind. The Chasm loves to trap the unwary.',
        'Materials are worth more than gold in the long run. Craft something useful.',
        'Watch your surroundings. The floor changes when you\'re not looking.'
    ],

    random_story: [
        'Once, I found a room full of gold on floor four. When I turned around, the door was gone. I dug for three days...',
        'My partner Rolf went too deep once. Said he saw something in the Core. Something watching. He never delved again.',
        'The old maps are useless, you know. The Chasm reshapes itself. Only fools trust paper.'
    ]
};

// ============================================================================
// NPC FACTORY
// ============================================================================

/**
 * Create an NPC instance
 * @param {string} npcId - NPC ID from NPC_DATA
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @returns {Object} NPC instance
 */
function createNPC(npcId, x, y) {
    const data = NPC_DATA[npcId];
    if (!data) {
        console.warn(`[NPCs] Unknown NPC ID: ${npcId}`);
        return null;
    }

    return {
        ...data,
        x: x,
        y: y,
        showInteraction: false,
        currentDialogue: data.initialDialogue,
        questsAvailable: [],
        hasNewDialogue: false
    };
}

/**
 * Get dialogue node
 * @param {string} nodeId - Dialogue node ID
 * @returns {Object|null}
 */
function getDialogueNode(nodeId) {
    return DIALOGUE_TREES[nodeId] || null;
}

/**
 * Get dynamic dialogue content
 * @param {string} type - Dynamic content type
 * @returns {string}
 */
function getDynamicContent(type) {
    const options = DYNAMIC_DIALOGUE[type];
    if (options && options.length > 0) {
        return options[Math.floor(Math.random() * options.length)];
    }
    return '';
}

// ============================================================================
// EXPORTS
// ============================================================================

window.NPC_DATA = NPC_DATA;
window.DIALOGUE_TREES = DIALOGUE_TREES;
window.DYNAMIC_DIALOGUE = DYNAMIC_DIALOGUE;
window.createNPC = createNPC;
window.getDialogueNode = getDialogueNode;
window.getDynamicContent = getDynamicContent;

// THE BLEEDING EARTH: World state helpers
window.isNPCPresentInWorldState = isNPCPresentInWorldState;
window.getNPCReplacement = getNPCReplacement;

console.log('[NPCs] NPC data loaded (with Elder Council and world state support)');
