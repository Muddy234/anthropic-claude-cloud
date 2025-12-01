function addMessage(text) {
    game.messageLog.push({ text, time: Date.now() });
    game.lastMessageTime = Date.now();
}
