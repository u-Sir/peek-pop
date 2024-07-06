const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'enableContainerIdentify': true,
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None'
};

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.local.get(keys, function (userConfigs) {
        keys.forEach(key => {
            if (userConfigs[key] !== null && userConfigs[key] !== undefined) {
                configs[key] = userConfigs[key];
            }
        });
        if (callback) callback();
    });
}

function saveConfig(key, value) {
    configs[key] = value;
    let data = {};
    data[key] = value;
    chrome.storage.local.set(data);
}

loadUserConfigs(() => {});

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
                saveConfig('shiftEnabled', request.shiftEnabled);
            }
        });

        saveConfig('lastClientX', request.lastClientX);
        saveConfig('lastClientY', request.lastClientY);

        screenWidth = request.width;
        screenHeight = request.height;

        chrome.storage.local.get(['disabledUrls'], data => {
            const disabledUrls = data.disabledUrls || [];
            const currentUrl = sender.tab.url;

            if (isUrlDisabled(currentUrl, disabledUrls)) {
                return; // Do nothing if the URL is disabled
            }

            if (request.linkUrl) {
                loadUserConfigs(() => handleLinkInPopup(request.linkUrl, sender.tab, currentWindow));
            }
        });
    });
});

function handleLinkInPopup(linkUrl, tab, currentWindow) {
    let originalWindowIsFullscreen = false;

    // Validate the URL before proceeding
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return;
    }

    chrome.windows.getCurrent(originWindow => {
        if (originWindow.type !== 'popup') {
            saveConfig('originWindowId', originWindow.id);
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

            const screenDimensions = getScreenDimensions(currentWindow);

            if (configs.tryOpenAtMousePosition && lastClientX && lastClientY) {
                dx = lastClientX - width / 2;
                dy = lastClientY - height / 2;
            } else {
                dx = screenDimensions.left + (screenDimensions.width - width) / 2;
                dy = screenDimensions.top + (screenDimensions.height - height) / 2;
            }

            if (dx < screenDimensions.left) dx = screenDimensions.left;
            if (dy < screenDimensions.top) dy = screenDimensions.top;
            if (dx + width > screenDimensions.left + screenDimensions.width) dx = screenDimensions.left + screenDimensions.width - width;
            if (dy + height > screenDimensions.top + screenDimensions.height) dy = screenDimensions.top + screenDimensions.height - height;
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

    if (alarmName.startsWith('popupLinkAlarm_')) {
        chrome.storage.local.get(alarmName, data => {
            if (!data || !data[alarmName]) return;

            const { dx, dy, width, height, incognito, originalWindowIsFullscreen, linkUrl, searchUrl, cookieStoreId } = data[alarmName];

            let createData = {
                url: linkUrl || searchUrl,
                type: "popup",
                width,
                height,
                left: dx,
                top: dy,
                incognito
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
        });
    } else if (alarmName.startsWith('focusChangeAlarm_')) {
        chrome.storage.local.get(alarmName, data => {
            if (!data || !data[alarmName]) return;

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
        });
    }
});

function isUrlDisabled(url, disabledUrls) {
    for (let disabledUrl of disabledUrls) {
        if (url.startsWith(disabledUrl)) {
            return true;
        }
    }
    return false;
}

function getScreenDimensions(currentWindow) {
    return {
        left: currentWindow.left || 0,
        top: currentWindow.top || 0,
        width: currentWindow.width || window.screen.availWidth,
        height: currentWindow.height || window.screen.availHeight
    };
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

