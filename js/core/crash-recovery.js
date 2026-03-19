// ============================================================================
// CRASH RECOVERY - The Shifting Chasm
// ============================================================================
// Global error handlers that catch unhandled exceptions and promise rejections.
// Renders a recovery overlay and allows the player to return to village safely.
// ============================================================================

(function() {
    let crashOverlayShown = false;

    function showCrashOverlay(errorInfo) {
        if (crashOverlayShown) return;
        crashOverlayShown = true;

        // Log the error context
        console.error('[CrashRecovery] Caught unhandled error:', errorInfo);

        // Try to save current state before showing overlay
        try {
            if (typeof SaveManager !== 'undefined' && typeof persistentState !== 'undefined') {
                SaveManager.save();
                console.log('[CrashRecovery] Emergency save completed');
            }
        } catch (saveError) {
            console.error('[CrashRecovery] Emergency save failed:', saveError);
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'crash-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); z-index: 10000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: monospace; color: #e0e0e0;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Something went wrong';
        title.style.cssText = 'color: #ef5350; margin-bottom: 16px; font-size: 24px;';

        const message = document.createElement('p');
        message.textContent = typeof errorInfo === 'string' ? errorInfo : (errorInfo.message || 'An unexpected error occurred.');
        message.style.cssText = 'max-width: 600px; text-align: center; margin-bottom: 24px; color: #aaa; font-size: 14px; word-break: break-word;';

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 16px;';

        const villageBtn = document.createElement('button');
        villageBtn.textContent = 'Return to Village';
        villageBtn.style.cssText = `
            padding: 12px 24px; font-size: 16px; font-family: monospace;
            background: #2196f3; color: white; border: none; cursor: pointer;
            border-radius: 4px;
        `;
        villageBtn.onclick = function() {
            overlay.remove();
            crashOverlayShown = false;
            try {
                if (typeof returnToVillage === 'function') {
                    returnToVillage();
                } else if (typeof startInVillage === 'function') {
                    startInVillage();
                } else {
                    location.reload();
                }
            } catch (e) {
                location.reload();
            }
        };

        const reloadBtn = document.createElement('button');
        reloadBtn.textContent = 'Reload Game';
        reloadBtn.style.cssText = `
            padding: 12px 24px; font-size: 16px; font-family: monospace;
            background: #424242; color: white; border: none; cursor: pointer;
            border-radius: 4px;
        `;
        reloadBtn.onclick = function() {
            location.reload();
        };

        btnContainer.appendChild(villageBtn);
        btnContainer.appendChild(reloadBtn);
        overlay.appendChild(title);
        overlay.appendChild(message);
        overlay.appendChild(btnContainer);
        document.body.appendChild(overlay);
    }

    // Only show crash overlay after game has started (not during script loading)
    let gameStarted = false;
    window.enableCrashRecovery = function() { gameStarted = true; };

    window.onerror = function(message, source, lineno, colno, error) {
        // Ignore CORS-sanitized "Script error." with no useful info (common on file:// protocol)
        if (message === 'Script error.' && !source && lineno === 0 && colno === 0) {
            console.warn('[CrashRecovery] Ignored CORS-sanitized script error (no details available)');
            return true;
        }

        // During loading, log but don't show the overlay
        if (!gameStarted) {
            console.warn('[CrashRecovery] Load-time error (suppressed overlay):', message, source, lineno, colno);
            return true;
        }

        showCrashOverlay({
            message: `${message} (${source}:${lineno}:${colno})`,
            error: error
        });
        return true; // Prevent default browser error handling
    };

    window.onunhandledrejection = function(event) {
        showCrashOverlay({
            message: `Unhandled promise rejection: ${event.reason}`
        });
    };

    console.log('[CrashRecovery] Global error handlers installed');
})();
