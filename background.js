const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchInPopupEnabled': true,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'disabledUrls': []
};

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.local.get(keys, function (userConfigs) {
        keys.forEach(key => {
            if (userConfigs[key] !== null && userConfigs[key] !== undefined) {
                configs[key] = userConfigs[key];
            }
        });

        if (callback) callback(userConfigs);
    });
}

loadUserConfigs(() => {});
let screenWidth = 0;
let screenHeight = 0;

chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs(() => {});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.storage.local.set({
        lastClientX: request.lastClientX,
        lastClientY: request.lastClientY
    });
    
    screenWidth = request.width;
    screenHeight = request.height;
    
    chrome.storage.local.get('disabledUrls', data => {
        const disabledUrls = data.disabledUrls || [];
        const currentUrl = sender.tab.url;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            return; // Do nothing if the URL is disabled
        }

        if (request.linkUrl) {
            loadUserConfigs(() => handleLinkInPopup(request.linkUrl, sender.tab));
        } else if (request.selectionText) {
            loadUserConfigs(() => handleTextSearchInPopup(request.selectionText, sender.tab));
        }
    });
});

function handleLinkInPopup(linkUrl, tab) {
    let originalWindowIsFullscreen = false;

    chrome.windows.getCurrent(originWindow => {
        if (originWindow.type !== 'popup') {
            chrome.storage.local.set({ originWindowId: originWindow.id });
        }

        if (originWindow.state === 'fullscreen') {
            originalWindowIsFullscreen = true;
            chrome.windows.update(originWindow.id, {
                state: 'maximized'
            });
        }

        chrome.storage.local.get(['lastClientX', 'lastClientY'], ({ lastClientX, lastClientY }) => {
            let dx, dy;
            let height = parseInt(configs.popupHeight, 10);
            let width = parseInt(configs.popupWidth, 10);

            if (configs.tryOpenAtMousePosition && lastClientX && lastClientY) {
                dx = lastClientX - width / 2;
                dy = lastClientY - height / 2;
            } else {
                dx = screenWidth / 2 - width / 2;
                dy = screenHeight / 2 - height / 2;
            }

            if (dx < 0) dx = 0;
            if (dy < 0) dy = 0;
            if (dx + width > screenWidth) dx -= (dx + width - screenWidth);
            if (dy + height > screenHeight) dy -= (dy + height - screenHeight);
            dx = Math.round(dx);
            dy = Math.round(dy);

            const alarmData = { linkUrl, dx, dy, width, height, incognito: tab.incognito, originalWindowIsFullscreen };

            // Check if tab.cookieStoreId is not "firefox-default" before setting cookieStoreId in alarmData
            if (tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") {
                alarmData.cookieStoreId = tab.cookieStoreId;
            }

            const alarmName = `popupLinkAlarm_${Date.now()}`;
            chrome.storage.local.set({ [alarmName]: alarmData });

            const delayInMilliseconds = originalWindowIsFullscreen ? 600 : 0;
            chrome.alarms.create(alarmName, { when: Date.now() + delayInMilliseconds });
        });
    });
}

function handleTextSearchInPopup(selectionText, tab) {
    let originalWindowIsFullscreen = false;

    chrome.windows.getCurrent(originWindow => {
        if (originWindow.type !== 'popup') {
            chrome.storage.local.set({ originWindowId: originWindow.id });
        }

        if (originWindow.state === 'fullscreen') {
            originalWindowIsFullscreen = true;
            chrome.windows.update(originWindow.id, {
                state: 'maximized'
            });
        }

        chrome.storage.local.get(['lastClientX', 'lastClientY'], ({ lastClientX, lastClientY }) => {
            let dx, dy;
            let height = parseInt(configs.popupHeight, 10);
            let width = parseInt(configs.popupWidth, 10);

            if (configs.tryOpenAtMousePosition && lastClientX && lastClientY) {
                dx = lastClientX - width / 2;
                dy = lastClientY - height / 2;
            } else {
                dx = screenWidth / 2 - width / 2;
                dy = screenHeight / 2 - height / 2;
            }

            if (dx < 0) dx = 0;
            if (dy < 0) dy = 0;
            if (dx + width > screenWidth) dx -= (dx + width - screenWidth);
            if (dy + height > screenHeight) dy -= (dy + height - screenHeight);
            dx = Math.round(dx);
            dy = Math.round(dy);

            const searchUrl = configs.popupSearchUrl.replace('%s', encodeURIComponent(selectionText));
            const alarmData = { searchUrl, dx, dy, width, height, incognito: tab.incognito, originalWindowIsFullscreen };

            // Check if tab.cookieStoreId is not "firefox-default" before setting cookieStoreId in alarmData
            if (tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") {
                alarmData.cookieStoreId = tab.cookieStoreId;
            }

            const alarmName = `popupSearchAlarm_${Date.now()}`;
            chrome.storage.local.set({ [alarmName]: alarmData });

            const delayInMilliseconds = originalWindowIsFullscreen ? 600 : 0;
            chrome.alarms.create(alarmName, { when: Date.now() + delayInMilliseconds });
        });
    });
}

chrome.alarms.onAlarm.addListener(alarm => {
    const alarmName = alarm.name;

    if (alarmName.startsWith('popupLinkAlarm_') || alarmName.startsWith('popupSearchAlarm_')) {
        chrome.storage.local.get(alarmName, data => {
            if (data[alarmName]) {
                const { linkUrl, searchUrl, dx, dy, width, height, incognito, cookieStoreId, originalWindowIsFullscreen } = data[alarmName];

                const url = linkUrl || searchUrl;
                const createData = {
                    url: url,
                    type: 'popup',
                    width: width,
                    height: height,
                    top: dy,
                    left: dx,
                    focused: true,
                    incognito: incognito
                };

                // Only set cookieStoreId in createData if it's not "firefox-default"
                if (cookieStoreId && cookieStoreId !== "firefox-default") {
                    createData.cookieStoreId = cookieStoreId;
                }

                chrome.windows.create(createData, popupWindow => {
                    chrome.windows.update(popupWindow.id, {
                        top: dy,
                        left: dx
                    });

                    if (!configs.closeWhenFocusedInitialWindow) return;

                    const focusAlarmName = `focusChangeAlarm_${Date.now()}`;
                    const focusAlarmData = { popupWindowId: popupWindow.id, originalWindowIsFullscreen };
                    chrome.storage.local.set({ [focusAlarmName]: focusAlarmData });

                    chrome.alarms.create(focusAlarmName, { when: Date.now() + 300 });
                });

                chrome.storage.local.remove(alarmName);
            }
        });
    } else if (alarmName.startsWith('focusChangeAlarm_')) {
        chrome.storage.local.get(alarmName, data => {
            if (data[alarmName]) {
                const { popupWindowId, originalWindowIsFullscreen } = data[alarmName];

                function windowFocusListener(windowId) {
                    chrome.storage.local.get('originWindowId', ({ originWindowId }) => {
                        if (windowId === originWindowId) {
                            chrome.windows.onFocusChanged.removeListener(windowFocusListener);
                            chrome.windows.remove(popupWindowId);

                            if (originalWindowIsFullscreen) {
                                chrome.windows.update(originWindowId, {
                                    state: 'fullscreen'
                                });
                            }
                        }
                    });
                }

                chrome.windows.onFocusChanged.addListener(windowFocusListener);
                chrome.storage.local.remove(alarmName);
            }
        });
    }
});

function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => {
        if (disabledUrl.includes('*')) {
            const regex = new RegExp(disabledUrl.replace(/\*/g, '.*'));
            return regex.test(url);
        }
        return url.includes(disabledUrl);
    });
}
