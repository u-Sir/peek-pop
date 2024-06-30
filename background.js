const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchInPopupEnabled': true,
    'popupSearchUrl': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'enableContainerIdentify': true,
    'shiftEnabled': false,
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 0
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

loadUserConfigs(() => { });
let screenWidth = 0;
let screenHeight = 0;
let contextMenuCreated = false;

chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs(() => { });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    chrome.windows.getCurrent(currentWindow => {
        chrome.storage.local.get('originWindowId', ({ originWindowId }) => {
            if (request.action === 'ensureContextMenu' && currentWindow.id !== originWindowId) {
                if (!contextMenuCreated) {
                    chrome.contextMenus.create({
                        id: 'sendPageBack',
                        title: chrome.i18n.getMessage('sendPageBack'),
                        contexts: ['page']
                    });
                    contextMenuCreated = true;
                }
            }
            
            if (request.action === 'windowRegainedFocus' && currentWindow.id === originWindowId) {
                chrome.windows.getAll({ populate: true }, windows => {
                    windows.forEach(window => {
                        if (window.type === 'popup') {
                            chrome.windows.remove(window.id);

                            // Remove the context menu item when the popup window is closed
                            chrome.contextMenus.remove('sendPageBack');
                            popupWindowId = null;
                            contextMenuCreated = false;
                        }
                    });
                });
            }

            if (request.action === 'updateshiftEnabled') {
                configs.shiftEnabled = request.shiftEnabled;
                chrome.storage.local.set({ shiftEnabled: request.shiftEnabled });
            }
        });
    });



    chrome.storage.local.set({
        lastClientX: request.lastClientX,
        lastClientY: request.lastClientY
    });

    screenWidth = request.width;
    screenHeight = request.height;

    chrome.storage.local.get(['disabledUrls', 'searchInPopupEnabled'], data => {
        const disabledUrls = data.disabledUrls || [];
        const searchInPopupEnabled = data.searchInPopupEnabled;
        const currentUrl = sender.tab.url;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            return; // Do nothing if the URL is disabled
        }

        if (request.linkUrl) {
            loadUserConfigs(() => handleLinkInPopup(request.linkUrl, sender.tab));
        } else if (searchInPopupEnabled && request.selectionText) {
            loadUserConfigs(() => handleTextSearchInPopup(request.selectionText, sender.tab));
        }
    });
});

function handleLinkInPopup(linkUrl, tab) {
    let originalWindowIsFullscreen = false;

    // Validate the URL before proceeding
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return;
    }

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

        chrome.storage.local.get(['lastClientX', 'lastClientY', 'enableContainerIdentify'], ({ lastClientX, lastClientY, enableContainerIdentify }) => {
            let dx = 0, dy = 0;
            let height = parseInt(configs.popupHeight, 10);
            let width = parseInt(configs.popupWidth, 10);
            const enableContainer = enableContainerIdentify !== undefined ? enableContainerIdentify : configs.enableContainerIdentify;

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
            if (enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") {
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

        chrome.storage.local.get(['lastClientX', 'lastClientY', 'enableContainerIdentify'], ({ lastClientX, lastClientY, enableContainerIdentify }) => {
            let dx = 0, dy = 0;
            let height = parseInt(configs.popupHeight, 10);
            let width = parseInt(configs.popupWidth, 10);
            const enableContainer = enableContainerIdentify !== undefined ? enableContainerIdentify : configs.enableContainerIdentify;

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

            if (enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") {
                alarmData.cookieStoreId = tab.cookieStoreId;
            }

            const alarmName = `popupSearchAlarm_${Date.now()}`;
            chrome.storage.local.set({ [alarmName]: alarmData });
            const delayInMilliseconds = originalWindowIsFullscreen ? 600 : 0;
            chrome.alarms.create(alarmName, { when: Date.now() + delayInMilliseconds });
        });
    });
}

function isValidUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

chrome.alarms.onAlarm.addListener(alarm => {
    const alarmName = alarm.name;

    if (alarmName.startsWith('popupLinkAlarm_') || alarmName.startsWith('popupSearchAlarm_')) {
        chrome.storage.local.get(alarmName, data => {
            if (data[alarmName]) {
                const { linkUrl, searchUrl, dx, dy, width, height, incognito, originalWindowIsFullscreen, cookieStoreId } = data[alarmName];

                const url = linkUrl || searchUrl;

                // Validate the URL before creating the popup window
                if (!isValidUrl(url)) {
                    console.error('Invalid URL:', url);
                    return;
                }

                chrome.storage.local.set({ popupUrl: url });

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

                if (cookieStoreId && cookieStoreId !== "firefox-default") {
                    createData.cookieStoreId = cookieStoreId;
                }

                chrome.windows.create(createData, popupWindow => {
                    if (chrome.runtime.lastError) {
                        console.error('Error creating popup window:', chrome.runtime.lastError);
                    } else if (popupWindow) {
                        chrome.windows.update(popupWindow.id, {
                            top: dy,
                            left: dx
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Error updating popup window position:', chrome.runtime.lastError);
                            }
                        });

                        if (!configs.closeWhenFocusedInitialWindow) return;

                        const focusAlarmName = `focusChangeAlarm_${Date.now()}`;
                        const focusAlarmData = { popupWindowId: popupWindow.id, originalWindowIsFullscreen };
                        chrome.storage.local.set({ [focusAlarmName]: focusAlarmData });

                        chrome.alarms.create(focusAlarmName, { when: Date.now() + 300 });
                    } else {
                        console.error('Failed to create popup window.');
                    }
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

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'sendPageBack') {
        chrome.storage.local.get(['originWindowId', 'enableContainerIdentify'], ({ originWindowId, enableContainerIdentify }) => {
            if (originWindowId) {
                const createData = {
                    windowId: originWindowId,
                    url: tab.url
                };

                if (enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") {
                    createData.cookieStoreId = tab.cookieStoreId;
                }

                chrome.tabs.create(createData, () => {
                    // Close the popup window
                    chrome.windows.get(tab.windowId, (window) => {
                        if (window.type === 'popup') {
                            chrome.windows.remove(window.id);
                        }
                    });

                    // Remove the context menu item
                    chrome.contextMenus.remove('sendPageBack', () => {
                        contextMenuCreated = false; // Reset flag
                    });
                });
            } else {
                console.error('No original window ID found in storage.');
            }
        });
    }
});
