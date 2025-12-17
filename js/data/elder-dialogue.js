// === js/data/elder-dialogue.js ===
// THE BLEEDING EARTH: Elder Council dialogue trees with world state conditions

// ============================================================================
// WORLD STATE CONDITIONAL DIALOGUE
// ============================================================================

/**
 * Get the appropriate dialogue node based on world state
 * @param {string} baseNodeId - Base dialogue node ID
 * @returns {Object} Dialogue node for current world state
 */
function getWorldStateDialogue(baseNodeId) {
    const worldState = typeof WorldStateSystem !== 'undefined' ?
        WorldStateSystem.getState() : 1;

    // Check for state-specific version
    const stateNodeId = `${baseNodeId}_state${worldState}`;
    if (ELDER_DIALOGUE[stateNodeId]) {
        return ELDER_DIALOGUE[stateNodeId];
    }

    // Fall back to base node
    return ELDER_DIALOGUE[baseNodeId] || null;
}

/**
 * Check if dagger confrontation is available
 */
function canConfrontElders() {
    return typeof WorldStateSystem !== 'undefined' && WorldStateSystem.hasDagger();
}

// ============================================================================
// ELDER MIRA DIALOGUE (The Guilty One)
// ============================================================================

const ELDER_DIALOGUE = {

    // ========================================================================
    // ELDER MIRA - INTRO & MAIN (World State Variants)
    // ========================================================================

    elder_mira_intro: {
        speaker: 'elder_mira',
        text: 'Welcome, delver. I am Elder Mira. The village survives because brave souls like you venture into the Chasm. We need you to retrieve Aether-Wards from below to stabilize the volcano.',
        responses: [
            { text: 'What are Aether-Wards?', next: 'elder_mira_wards' },
            { text: 'Tell me about the Chasm.', next: 'elder_mira_chasm' },
            { text: 'I\'m ready to descend.', action: 'close' }
        ]
    },

    elder_mira_intro_state2: {
        speaker: 'elder_mira',
        text: '*coughs from the ash* You\'ve returned. The situation... worsens. We need those Wards more than ever. Please, hurry.',
        responses: [
            { text: 'What\'s happening to the village?', next: 'elder_mira_ash_explain' },
            { text: 'I\'ll find more Wards.', action: 'close' }
        ]
    },

    elder_mira_intro_state3: {
        speaker: 'elder_mira',
        text: '*trembling* The ground shakes. Grimwald is... gone. We are running out of time. Please, you must go deeper. The old Wards are failing.',
        condition: () => !canConfrontElders(),
        responses: [
            { text: 'The Wards aren\'t working, are they?', next: 'elder_mira_doubt' },
            { text: 'I\'ll do what I can.', action: 'close' }
        ]
    },

    elder_mira_intro_state3_dagger: {
        speaker: 'elder_mira',
        text: '*trembling* The ground shakes. Grimwald is... You\'re back. I see something in your eyes. Something cold.',
        condition: () => canConfrontElders(),
        responses: [
            { text: '[Show the Dagger] I found something in the Chasm.', next: 'elder_mira_confrontation' },
            { text: 'We need to talk about the Wards.', next: 'elder_mira_doubt' },
            { text: 'Nothing. I\'ll continue.', action: 'close' }
        ]
    },

    // ========================================================================
    // ELDER MIRA - LORE
    // ========================================================================

    elder_mira_wards: {
        speaker: 'elder_mira',
        text: 'Aether-Wards are ancient seals that regulate the volcano\'s heat. They were placed by our ancestors to keep the mountain dormant. Over time, they... degrade. We must replace them.',
        responses: [
            { text: 'How do I find them?', next: 'elder_mira_ward_location' },
            { text: 'What happens if we don\'t?', next: 'elder_mira_consequence' }
        ]
    },

    elder_mira_ward_location: {
        speaker: 'elder_mira',
        text: 'The deeper levels of the Chasm contain the old Ward chambers. Bring back what you find. The more Wards we have, the longer we can delay the... eruption.',
        responses: [
            { text: 'I understand.', action: 'close' }
        ]
    },

    elder_mira_consequence: {
        speaker: 'elder_mira',
        text: '*looks away* If the volcano fully awakens... everything we\'ve built. Everyone we love. Gone.',
        responses: [
            { text: 'I\'ll find the Wards.', action: 'close' }
        ]
    },

    elder_mira_chasm: {
        speaker: 'elder_mira',
        text: 'The Shifting Chasm appeared decades ago beneath the Slumbering Peak. It leads deep into the earth, where heat and ancient things dwell. Many have descended. Few return.',
        responses: [
            { text: 'I\'ll be careful.', action: 'close' }
        ]
    },

    elder_mira_ash_explain: {
        speaker: 'elder_mira',
        text: 'The volcano stirs in its sleep. The ash falls heavier each day. Some families have already fled. I... I pray we can stop this.',
        responses: [
            { text: 'Is there something you\'re not telling me?', next: 'elder_mira_hesitation' },
            { text: 'I\'ll find more Wards.', action: 'close' }
        ]
    },

    elder_mira_hesitation: {
        speaker: 'elder_mira',
        text: '*hesitates* I... No. Just old fears. Focus on the task. The Wards are all that matter now.',
        responses: [
            { text: 'Very well.', action: 'close' }
        ]
    },

    elder_mira_doubt: {
        speaker: 'elder_mira',
        text: '*long pause* The Wards... have always been a temporary measure. A century ago, the original seals were... compromised. We\'ve been patching ever since.',
        responses: [
            { text: 'Compromised how?', next: 'elder_mira_partial_truth' },
            { text: 'I see.', action: 'close' }
        ]
    },

    elder_mira_partial_truth: {
        speaker: 'elder_mira',
        text: 'An accident. A... mistake made by those who came before us. We\'ve paid for it ever since. Please, don\'t ask more. Just find the Wards.',
        responses: [
            { text: 'Alright.', action: 'close' }
        ]
    },

    // ========================================================================
    // ELDER MIRA - CONFRONTATION
    // ========================================================================

    elder_mira_confrontation: {
        speaker: 'elder_mira',
        text: '*face goes pale* That dagger... Where did you find that?',
        responses: [
            { text: 'On a corpse. Deep in the Chasm. A hero who never returned.', next: 'elder_mira_confession_1' },
            { text: 'You know exactly where I found it.', next: 'elder_mira_confession_1' }
        ]
    },

    elder_mira_confession_1: {
        speaker: 'elder_mira',
        text: '*sits down heavily* Aldric. After a hundred years... he\'s been found. *begins to weep* I was young then. A new Elder. I didn\'t... I couldn\'t stop them.',
        responses: [
            { text: 'Stop who? What happened?', next: 'elder_mira_confession_2' },
            { text: 'You knew. All along, you knew.', next: 'elder_mira_confession_2' }
        ]
    },

    elder_mira_confession_2: {
        speaker: 'elder_mira',
        text: 'Thorne and Vallus. They cracked the seal on purpose. The heat from the Titan made our crops grow ten times faster. We became wealthy. Powerful. But the Titan began to wake.',
        responses: [
            { text: 'And Aldric discovered this?', next: 'elder_mira_confession_3' }
        ]
    },

    elder_mira_confession_3: {
        speaker: 'elder_mira',
        text: 'He was sent to "retrieve Wards." But he found the truth instead. He threatened to expose everything. Vallus followed him into the depths. He came back alone.',
        responses: [
            { text: 'Vallus murdered him.', next: 'elder_mira_confession_4' },
            { text: 'And you did nothing.', next: 'elder_mira_confession_4' }
        ]
    },

    elder_mira_confession_4: {
        speaker: 'elder_mira',
        text: 'I was a coward. I told myself the village needed prosperity. I told myself Aldric was wrong. But the Wards... they were never meant to fix what we broke. Only to delay it.',
        responses: [
            { text: 'Can the Titan be stopped?', next: 'elder_mira_solution' },
            { text: 'Is there any way to save the village?', next: 'elder_mira_solution' }
        ]
    },

    elder_mira_solution: {
        speaker: 'elder_mira',
        text: 'The ancient texts speak of the Heart of the World. The Titan\'s core. Thorne says it\'s impossible, but... if someone could reach it, perhaps end the Titan\'s suffering... the volcano might finally rest.',
        responses: [
            { text: 'Then that\'s what I\'ll do.', next: 'elder_mira_farewell' },
            { text: 'Where is this Heart?', next: 'elder_mira_heart_location' }
        ]
    },

    elder_mira_heart_location: {
        speaker: 'elder_mira',
        text: 'The deepest floor. Floor 10. The Heart of the World. Malphas—that\'s what the ancients called it. Not a god. A prisoner. A Titan bound in chains of magic, slowly waking in agony.',
        responses: [
            { text: 'I\'ll free it from its suffering.', next: 'elder_mira_farewell' }
        ]
    },

    elder_mira_farewell: {
        speaker: 'elder_mira',
        text: 'Then go. Do what we could not. Save the village that betrayed you. And if you see Aldric\'s spirit... tell him I\'m sorry. Tell him we\'re all sorry.',
        responses: [
            { text: '[Descend to the Heart]', action: 'close' }
        ]
    },

    // ========================================================================
    // ELDER THORNE DIALOGUE (The Greedy One)
    // ========================================================================

    elder_thorne_intro: {
        speaker: 'elder_thorne',
        text: '*looks up from ledger* Another delver. Good. The village prospers because of resources from the Chasm. Don\'t waste time—find materials, find Wards, extract value.',
        responses: [
            { text: 'You seem very focused on profit.', next: 'elder_thorne_profit' },
            { text: 'I\'ll do my job.', action: 'close' }
        ]
    },

    elder_thorne_intro_state2: {
        speaker: 'elder_thorne',
        text: '*irritated* The ash ruins everything. Crops are dying, trade routes are closing. We need those Wards NOW. The village\'s economy depends on it.',
        responses: [
            { text: 'People are fleeing. Doesn\'t that concern you?', next: 'elder_thorne_callous' },
            { text: 'I\'m working on it.', action: 'close' }
        ]
    },

    elder_thorne_intro_state3: {
        speaker: 'elder_thorne',
        text: '*sweating* This is... a temporary setback. We\'ve survived worse. Find the Wards. The harvest can be salvaged if we act quickly.',
        condition: () => !canConfrontElders(),
        responses: [
            { text: 'People are dying. This isn\'t about harvest.', next: 'elder_thorne_denial' },
            { text: 'I\'ll try.', action: 'close' }
        ]
    },

    elder_thorne_confrontation: {
        speaker: 'elder_thorne',
        text: '*sees the dagger, face hardens* Where did you get that?',
        responses: [
            { text: 'You know where. A hero you had murdered.', next: 'elder_thorne_defiance' },
            { text: 'The truth was buried, but not deep enough.', next: 'elder_thorne_defiance' }
        ]
    },

    elder_thorne_defiance: {
        speaker: 'elder_thorne',
        text: 'Murdered? HA! That fool would have destroyed everything we built. A century of prosperity—wiped out by one self-righteous idealist. Vallus did what was necessary.',
        responses: [
            { text: 'You cracked the seal for profit.', next: 'elder_thorne_justify' },
            { text: 'And now everyone pays the price.', next: 'elder_thorne_justify' }
        ]
    },

    elder_thorne_justify: {
        speaker: 'elder_thorne',
        text: 'PROFIT? I saved this village! We were starving before the Great Harvest. The heat made us strong. I regret nothing. If I had to choose again, I\'d do the same.',
        responses: [
            { text: 'The volcano is waking. Your prosperity is ending.', next: 'elder_thorne_reality' },
            { text: 'You\'re a monster.', next: 'elder_thorne_reality' }
        ]
    },

    elder_thorne_reality: {
        speaker: 'elder_thorne',
        text: '*for the first time, fear shows* Then fix it. You\'re the hero now, aren\'t you? Go to the Heart. Kill the beast. Save us all. That\'s what heroes do.',
        responses: [
            { text: 'I will. But not for you.', action: 'close' }
        ]
    },

    elder_thorne_profit: {
        speaker: 'elder_thorne',
        text: 'Profit keeps the village alive. Sentiment doesn\'t feed children. Remember that.',
        responses: [
            { text: 'Whatever you say.', action: 'close' }
        ]
    },

    elder_thorne_callous: {
        speaker: 'elder_thorne',
        text: 'Weaklings leave. The strong remain. This village was built by those who didn\'t run from hardship.',
        responses: [
            { text: '...Right.', action: 'close' }
        ]
    },

    elder_thorne_denial: {
        speaker: 'elder_thorne',
        text: '*looks away* Just... find the Wards.',
        responses: [
            { text: 'Fine.', action: 'close' }
        ]
    },

    // ========================================================================
    // ELDER VALLUS DIALOGUE (The Coward / The Killer)
    // ========================================================================

    elder_vallus_intro: {
        speaker: 'elder_vallus',
        text: '*startles* Oh! A delver. Yes. Good. The Chasm is... be careful down there. It\'s dangerous. Very dangerous.',
        responses: [
            { text: 'You seem nervous.', next: 'elder_vallus_nervous' },
            { text: 'I\'ll be fine.', action: 'close' }
        ]
    },

    elder_vallus_intro_state2: {
        speaker: 'elder_vallus',
        text: '*wringing hands* The ash. It reminds me of... No, never mind. Please, find the Wards. Before it\'s too late.',
        responses: [
            { text: 'Reminds you of what?', next: 'elder_vallus_memory' },
            { text: 'I\'m doing my best.', action: 'close' }
        ]
    },

    elder_vallus_intro_state3: {
        speaker: 'elder_vallus',
        text: '*barely holding together* It\'s happening. Just like before. Just like when... *trails off*',
        condition: () => !canConfrontElders(),
        responses: [
            { text: 'When what happened?', next: 'elder_vallus_almost_confess' },
            { text: 'Stay calm. I\'ll handle it.', action: 'close' }
        ]
    },

    elder_vallus_confrontation: {
        speaker: 'elder_vallus',
        text: '*sees the dagger, goes white as a sheet* No. No no no. That\'s not... I threw it into the depths. It should have been lost forever.',
        responses: [
            { text: 'You killed him. You killed Aldric.', next: 'elder_vallus_breakdown' },
            { text: 'The Chasm remembers what you tried to bury.', next: 'elder_vallus_breakdown' }
        ]
    },

    elder_vallus_breakdown: {
        speaker: 'elder_vallus',
        text: '*collapses to knees* I didn\'t want to! Thorne said it was the only way! Aldric was going to tell everyone—the prosperity, the heat, the seal—he\'d ruin everything!',
        responses: [
            { text: 'You stabbed him in the back.', next: 'elder_vallus_confession' },
            { text: 'He was trying to save you all.', next: 'elder_vallus_confession' }
        ]
    },

    elder_vallus_confession: {
        speaker: 'elder_vallus',
        text: '*sobbing* He trusted me. He thought I was there to help. I\'ve seen his face every night for a hundred years. Forgive me. PLEASE, forgive me!',
        responses: [
            { text: 'I can\'t forgive you. But I can end this.', next: 'elder_vallus_plea' },
            { text: 'Your guilt doesn\'t undo what you did.', next: 'elder_vallus_plea' }
        ]
    },

    elder_vallus_plea: {
        speaker: 'elder_vallus',
        text: 'Then go. Go to the Heart. Kill the Titan. Save the people who deserve saving. I\'ll... I\'ll turn myself over to whatever justice remains. Just end this nightmare.',
        responses: [
            { text: 'I will.', action: 'close' }
        ]
    },

    elder_vallus_nervous: {
        speaker: 'elder_vallus',
        text: 'Nervous? No, I... I just don\'t like the depths. Bad memories.',
        responses: [
            { text: 'What kind of memories?', next: 'elder_vallus_deflect' },
            { text: 'Understood.', action: 'close' }
        ]
    },

    elder_vallus_deflect: {
        speaker: 'elder_vallus',
        text: 'Old stories. Nothing important. Just... be careful.',
        responses: [
            { text: 'Alright.', action: 'close' }
        ]
    },

    elder_vallus_memory: {
        speaker: 'elder_vallus',
        text: 'A long time ago... something bad happened. In the Chasm. I... I can\'t talk about it.',
        responses: [
            { text: 'Fine.', action: 'close' }
        ]
    },

    elder_vallus_almost_confess: {
        speaker: 'elder_vallus',
        text: 'When... *long pause* When someone had to make a terrible choice. To protect the village. It was wrong. We knew it was wrong. But we did it anyway.',
        responses: [
            { text: 'What did you do?', next: 'elder_vallus_stops' },
            { text: 'I\'ll find out eventually.', action: 'close' }
        ]
    },

    elder_vallus_stops: {
        speaker: 'elder_vallus',
        text: '*shakes head violently* I can\'t. I can\'t. Just... go. Please.',
        responses: [
            { text: 'Very well.', action: 'close' }
        ]
    }
};

// ============================================================================
// REGISTER DIALOGUE WITH MAIN SYSTEM
// ============================================================================

/**
 * Merge Elder dialogue into main DIALOGUE_TREES
 */
function registerElderDialogue() {
    if (typeof DIALOGUE_TREES !== 'undefined') {
        Object.assign(DIALOGUE_TREES, ELDER_DIALOGUE);
        console.log('[ElderDialogue] Registered Elder Council dialogue trees');
    }
}

// Register on load
if (typeof DIALOGUE_TREES !== 'undefined') {
    registerElderDialogue();
} else {
    // Wait for DIALOGUE_TREES to be defined
    window.addEventListener('load', registerElderDialogue);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ELDER_DIALOGUE = ELDER_DIALOGUE;
window.getWorldStateDialogue = getWorldStateDialogue;
window.canConfrontElders = canConfrontElders;
window.registerElderDialogue = registerElderDialogue;

console.log('[ElderDialogue] Elder Council narrative dialogue loaded');
