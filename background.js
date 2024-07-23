const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None',
    'originWindowId': '', // Ensure this is defined correctly
    'dragMovePx': 0,
    'rememberPopupSizeAndPosition': false,
    'windowType': 'popup'
};

let contextMenuCreated = false;

// Load user configurations from storage
async function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

// Save a specific configuration
async function saveConfig(key, value) {
    configs[key] = value;
    return new Promise(resolve => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}

// Handle context menu item click
function onMenuItemClicked(info, tab) {
    if (info.menuItemId === 'sendPageBack') {
        loadUserConfigs().then(userConfigs => {
            const { originWindowId } = userConfigs;

            if (originWindowId) {
                chrome.tabs.create({ windowId: originWindowId, url: tab.url }, () => {
                    chrome.windows.get(tab.windowId, window => {
                        if (window.id) chrome.windows.remove(window.id);
                    });
                    chrome.contextMenus.remove('sendPageBack');
                    contextMenuCreated = false;
                    chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                });
            } else {
                console.error('No original window ID found in storage.');
            }
        });
    }
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs().then(userConfigs => {
        const keysToSave = Object.keys(configs).filter(key => userConfigs[key] === undefined);
        Promise.all(keysToSave.map(key => saveConfig(key, configs[key])))
            .catch(error => console.error('Error during installation setup:', error));
    });
});

// Handle incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message in background script:', request);

    new Promise((resolve, reject) => {
        chrome.windows.getCurrent(window => {
            if (chrome.runtime.lastError) {
                console.error('Error getting current window:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(window);
            }
        });
    })
        .then(currentWindow => {
            console.log('Current window:', currentWindow);

            return loadUserConfigs().then(userConfigs => {
                let originWindowId = userConfigs.originWindowId || currentWindow.id; // Set originWindowId if not defined

                if (!userConfigs.originWindowId) {
                    return saveConfig('originWindowId', originWindowId).then(() => originWindowId);
                }

                return originWindowId;
            }).then(originWindowId => {
                chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

                if (request.checkContextMenuItem) {
                    if (!contextMenuCreated) {
                        chrome.contextMenus.create({
                            id: 'sendPageBack',
                            title: chrome.i18n.getMessage('sendPageBack'),
                            contexts: ['page']
                        });
                        contextMenuCreated = true;
                    }
                    sendResponse({ status: 'context menu checked' });
                }

                if (request.action === 'windowRegainedFocus' && currentWindow.id === originWindowId) {
                    chrome.storage.local.get('popupWindowsInfo', (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo || {};
                        const popupsToRemove = Object.keys(popupWindowsInfo[originWindowId] || {});

                        chrome.windows.getAll({ populate: true }, windows => {
                            windows.forEach(window => {
                                if (popupsToRemove.includes(window.id.toString())) {
                                    chrome.windows.remove(window.id);
                                }
                            });

                            chrome.contextMenus.remove('sendPageBack');
                            contextMenuCreated = false;
                            sendResponse({ status: 'window focus handled' });
                        });
                    });
                }

                return Promise.all([
                    saveConfig('lastClientX', request.lastClientX),
                    saveConfig('lastClientY', request.lastClientY),
                    saveConfig('lastScreenTop', request.top),
                    saveConfig('lastScreenLeft', request.left),
                    saveConfig('lastScreenWidth', request.width),
                    saveConfig('lastScreenHeight', request.height)
                ]).then(() => {
                    return loadUserConfigs().then(userConfigs => {
                        const { disabledUrls, rememberPopupSizeAndPosition, windowType } = userConfigs;

                        if (isUrlDisabled(sender.tab.url, disabledUrls)) {
                            sendResponse({ status: 'url disabled' });
                        } else if (request.linkUrl) {
                            if (currentWindow.id !== originWindowId) {
                                saveConfig('originWindowId', currentWindow.id);
                            }
                            handleLinkInPopup(request.linkUrl, sender.tab, currentWindow, rememberPopupSizeAndPosition, windowType).then(() => {
                                sendResponse({ status: 'link handled' });
                            });
                        } else {
                            sendResponse({ status: 'message processed' });
                        }
                    });
                });
            });
        })
        .catch(error => {
            console.error('Error in background script:', error);
            sendResponse({ status: 'error', message: error.message });
        });

    return true; // Keeps the message channel open for async response
});

// Handle link opening in a popup
function handleLinkInPopup(linkUrl, tab, currentWindow, rememberPopupSizeAndPosition, windowType) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    return loadUserConfigs().then(userConfigs => {
        const {
            lastClientX, lastClientY,
            popupHeight, popupWidth, tryOpenAtMousePosition,
            lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight
        } = userConfigs;

        const defaultHeight = parseInt(popupHeight, 10) || 800;
        const defaultWidth = parseInt(popupWidth, 10) || 1000;

        let dx, dy, width = defaultWidth, height = defaultHeight;

        return new Promise((resolve, reject) => {
            if (rememberPopupSizeAndPosition) {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    const savedPositionAndSize = popupWindowsInfo.savedPositionAndSize || {};

                    if (Object.keys(savedPositionAndSize).length > 0) {
                        ({ left: dx, top: dy, width, height } = savedPositionAndSize);
                        console.log('Using savedPositionAndSize for popup:', { dx, dy, width, height });

                        createPopupWindow(linkUrl, tab, windowType, dx, dy, width, height, configs.originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    } else {
                        console.log('No saved popup position and size found.');
                        defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    }
                });
            } else {

                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    console.log('No saved popup position and size found.');
                    defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);

                });
            }

        });
    });
}

// Function to create a popup window
function createPopupWindow(linkUrl, tab, windowType, left, top, width, height, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    chrome.windows.create({
        url: linkUrl,
        type: windowType,
        top: top,
        left: left,
        width: width,
        height: height,
        focused: true
    }, newWindow => {
        if (rememberPopupSizeAndPosition) {
            savePopupPositionAndSize(newWindow.id, left, top, width, height, originWindowId, popupWindowsInfo)
                .then(() => addBoundsChangeListener(newWindow.id))
                .then(() => resolve())
                .catch(error => reject(error));
        } else {
            chrome.storage.local.get(['popupWindowsInfo'], result => {
                const popupWindowsInfo = result.popupWindowsInfo || {};
                const originWindowsInfo = popupWindowsInfo[originWindowId] || {};

                originWindowsInfo[newWindow.id] = {
                    windowType: newWindow.type,
                    top: newWindow.top,
                    left: newWindow.left,
                    width: newWindow.width,
                    height: newWindow.height
                };

                popupWindowsInfo[originWindowId] = originWindowsInfo;

                chrome.storage.local.set({ popupWindowsInfo }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving popupWindowsInfo:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('Saved popupWindowsInfo:', popupWindowsInfo);
                        resolve();
                    }
                });
            });
            resolve();
        }

    });
}

// Default popup creation logic
function defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    let dx, dy, width = defaultWidth, height = defaultHeight;

    dx = tryOpenAtMousePosition && lastClientX ? lastClientX - width / 2 : lastScreenLeft + (lastScreenWidth - width) / 2;
    dy = tryOpenAtMousePosition && lastClientY ? lastClientY - height / 2 : lastScreenTop + (lastScreenHeight - height) / 2;

    console.log('Using default popup position and size:', { dx, dy, width, height });

    createPopupWindow(linkUrl, tab, windowType, dx, dy, width, height, configs.originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
}

function addBoundsChangeListener(windowId) {
    return new Promise((resolve, reject) => {
        const onBoundsChanged = (window) => {
            if (window.id === windowId) {
                const bounds = {
                    top: window.top,
                    left: window.left,
                    width: window.width,
                    height: window.height
                };

                console.log('Popup bounds changed:', bounds);

                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};

                    if (!popupWindowsInfo[configs.originWindowId]) {
                        popupWindowsInfo[configs.originWindowId] = {};
                    }

                    popupWindowsInfo[configs.originWindowId][windowId] = {
                        windowType: window.type,
                        top: bounds.top,
                        left: bounds.left,
                        width: bounds.width,
                        height: bounds.height
                    };

                    // Save the updated position and size in savedPositionAndSize
                    popupWindowsInfo.savedPositionAndSize = {
                        top: bounds.top,
                        left: bounds.left,
                        width: bounds.width,
                        height: bounds.height
                    };

                    chrome.storage.local.set({ popupWindowsInfo }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error saving popupWindowsInfo:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Saved popupWindowsInfo:', popupWindowsInfo);
                            resolve();
                        }
                    });
                });
            }
        };

        chrome.windows.onBoundsChanged.addListener(onBoundsChanged);
        resolve(() => chrome.windows.onBoundsChanged.removeListener(onBoundsChanged));
    });
}




// Save the popup window's position and size
function savePopupPositionAndSize(popupWindowId, left, top, width, height, originWindowId, popupWindowsInfo) {
    return new Promise((resolve, reject) => {
        popupWindowsInfo[originWindowId] = popupWindowsInfo[originWindowId] || {};
        popupWindowsInfo[originWindowId][popupWindowId] = {
            windowType: 'popup',
            top,
            left,
            width,
            height
        };

        chrome.storage.local.set({ popupWindowsInfo }, () => {
            resolve();
        });
    });
}

// Check if the URL is disabled
function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => url.includes(disabledUrl));
}

// Validate URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}