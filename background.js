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
    'rememberPopupSizeAndPosition': false,
    'windowType': 'popup',
    'enableContainerIdentify': true,
    'popupWindowsInfo': {}
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
            const { popupWindowsInfo } = userConfigs;

            if (popupWindowsInfo && Object.keys(popupWindowsInfo).length > 0) {
                // Iterate through popupWindowsInfo to find the original window ID
                let originalWindowId = null;
                for (const originWindowId in popupWindowsInfo) {
                    if (popupWindowsInfo[originWindowId][tab.windowId]) {
                        originalWindowId = originWindowId;
                        break;
                    }
                }

                if (originalWindowId) {
                    const createData = { windowId: parseInt(originalWindowId), url: tab.url };
                    chrome.tabs.create(createData, () => {
                        chrome.windows.get(tab.windowId, window => {
                            if (window.id) chrome.windows.remove(window.id);
                        });
                        chrome.contextMenus.remove('sendPageBack');
                        contextMenuCreated = false;
                        chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                    });
                } else {
                    console.error('No original window ID found for current window ID in popupWindowsInfo.');
                }
            } else {
                console.error('popupWindowsInfo is empty or not properly structured.');
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
    // console.log('Received message in background script:', request);

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
            // console.log('Current window:', currentWindow);

            return loadUserConfigs().then(userConfigs => {

                let popupWindowsInfo = userConfigs.popupWindowsInfo || {};

                // Filter out the 'savedPositionAndSize' key
                const filteredPopupWindowsInfo = Object.keys(popupWindowsInfo).reduce((acc, key) => {
                    if (key !== 'savedPositionAndSize') {
                        acc[key] = popupWindowsInfo[key];
                    }
                    return acc;
                }, {});

                // Check if the filtered object is empty
                if (Object.keys(filteredPopupWindowsInfo).length === 0) {
                    popupWindowsInfo[currentWindow.id] = {}; // Set the current window ID as the original window ID
                    return saveConfig('popupWindowsInfo', popupWindowsInfo).then(() => popupWindowsInfo);
                }


                // If originWindowId is already defined, just return popupWindowsInfo
                return popupWindowsInfo;

            }).then(popupWindowsInfo => {

                const zoomFactor = new Promise((resolve, reject) => {
                    chrome.tabs.getZoom(sender.tab.id, (zoom) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(zoom);
                        }
                    });
                });

                chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

                if (request.checkContextMenuItem) {
                    chrome.storage.local.get('popupWindowsInfo', (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo || {};

                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });

                        if (!contextMenuCreated && !isCurrentWindowOriginal) {
                            chrome.contextMenus.create({
                                id: 'sendPageBack',
                                title: chrome.i18n.getMessage('sendPageBack'),
                                contexts: ['page']
                            });
                            contextMenuCreated = true;
                        }
                        sendResponse({ status: 'context menu checked' });

                        loadUserConfigs().then(userConfigs => {
                            if (userConfigs.rememberPopupSizeAndPosition) {
                                windowUpdateListener(currentWindow);
                            }
                        });
                    });
                }

                if (request.action === 'windowRegainedFocus') {
                    chrome.storage.local.get('popupWindowsInfo', (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo;
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });
                        if (isCurrentWindowOriginal) {
                            const popupsToRemove = Object.keys(popupWindowsInfo[currentWindow.id] || {});

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
                        }

                    });
                }

                return zoomFactor.then(zoom => {
                    return Promise.all([
                        saveConfig('lastClientX', request.lastClientX * zoom),
                        saveConfig('lastClientY', request.lastClientY * zoom),
                        saveConfig('lastScreenTop', request.top * zoom),
                        saveConfig('lastScreenLeft', request.left * zoom),
                        saveConfig('lastScreenWidth', request.width * zoom),
                        saveConfig('lastScreenHeight', request.height * zoom)
                    ]);
                }).then(() => {
                    return loadUserConfigs().then(userConfigs => {
                        const { disabledUrls, rememberPopupSizeAndPosition, windowType } = userConfigs;

                        if (isUrlDisabled(sender.tab.url, disabledUrls)) {
                            sendResponse({ status: 'url disabled' });
                        } else if (request.linkUrl) {
                            // if (currentWindow.id !== originWindowId) {
                            //     saveConfig('originWindowId', currentWindow.id);
                            // }
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
            lastClientX, lastClientY, enableContainerIdentify,
            popupHeight, popupWidth, tryOpenAtMousePosition,
            lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight
        } = userConfigs;

        const defaultHeight = parseInt(popupHeight, 10) || 800;
        const defaultWidth = parseInt(popupWidth, 10) || 1000;

        let dx, dy, width = defaultWidth, height = defaultHeight;

        return new Promise((resolve, reject) => {
            if (rememberPopupSizeAndPosition) {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo;
                    const savedPositionAndSize = popupWindowsInfo.savedPositionAndSize || {};

                    if (Object.keys(savedPositionAndSize).length > 0) {
                        ({ left: dx, top: dy, width, height } = savedPositionAndSize);
                        // console.log('Using savedPositionAndSize for popup:', { dx, dy, width, height });

                        createPopupWindow(linkUrl, tab, windowType, dx, dy, width, height, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject);
                    } else {
                        // console.log('No saved popup position and size found.');
                        defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject);
                    }
                });
            } else {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    // console.log('No saved popup position and size found.');
                    defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject);
                });
            }
        });
    });
}

// Function to create a popup window
function createPopupWindow(linkUrl, tab, windowType, left, top, width, height, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject) {
    const createData = {
        url: linkUrl,
        type: windowType,
        top: parseInt(top),
        left: parseInt(left),
        width: parseInt(width),
        height: parseInt(height),
        incognito: tab.incognito,
        ...(enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default' ? { cookieStoreId: tab.cookieStoreId } : {})
    };

    chrome.windows.create(createData, (newWindow) => {
        if (chrome.runtime.lastError) {
            console.error('Error creating popup window:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
        } else {
            updatePopupInfoAndListeners(newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject);
        }
    });
}

// Function to handle default popup creation
function defaultPopupCreation(linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject) {
    let dx, dy;

    if (tryOpenAtMousePosition) {
        dx = parseInt(lastClientX);
        dy = parseInt(lastClientY);
    } else {
        const screenWidth = lastScreenWidth || screen.width;
        const screenHeight = lastScreenHeight || screen.height;
    
        const centerX = (screenWidth - defaultWidth) / 2;
        const centerY = (screenHeight - defaultHeight) / 2;
    
        dx = parseInt(lastScreenLeft) + centerX;
        dy = parseInt(lastScreenTop) + centerY;
    }
    
    // Clamping dx and dy to ensure they are within the screen bounds
    dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - defaultWidth));
    dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - defaultHeight));
    

    createPopupWindow(linkUrl, tab, windowType, dx, dy, defaultWidth, defaultHeight, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject);
}

// Function to update popup info and add listeners
function updatePopupInfoAndListeners(newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, enableContainerIdentify, resolve, reject) {
    if (!popupWindowsInfo[originWindowId]) {
        popupWindowsInfo[originWindowId] = {};
    }
    popupWindowsInfo[originWindowId][newWindow.id] = {
        windowType: newWindow.type,
        top: newWindow.top,
        left: newWindow.left,
        width: newWindow.width,
        height: newWindow.height
    };

    if (rememberPopupSizeAndPosition) {
        popupWindowsInfo.savedPositionAndSize = {
            top: newWindow.top,
            left: newWindow.left,
            width: newWindow.width,
            height: newWindow.height
        };
    }

    chrome.storage.local.set({ popupWindowsInfo }, () => {
        chrome.windows.onRemoved.addListener(windowRemovedListener);
        resolve();
    });
}

// Function to handle URL validation
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

// Function to handle disabled URL checking
function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => url.includes(disabledUrl));
}

// Listener for updating popup window bounds
// Listener for updating popup window bounds
function windowUpdateListener(updatedWindow) {
    chrome.storage.local.get('popupWindowsInfo', (result) => {
        const popupWindowsInfo = result.popupWindowsInfo || {};

        for (const originWindowId in popupWindowsInfo) {
            if (popupWindowsInfo[originWindowId][updatedWindow.id]) {
                // Fetch the zoom factor
                chrome.windows.get(updatedWindow.id, { populate: true }, (window) => {
                    if (chrome.runtime.lastError || !window.tabs || !window.tabs.length) {
                        console.error('Error getting window tabs:', chrome.runtime.lastError || 'No tabs found');
                        return;
                    }

                    const tabId = window.tabs[0].id;

                    chrome.tabs.getZoom(tabId, (zoomFactor) => {
                        if (chrome.runtime.lastError) {
                            console.error('Error getting zoom factor:', chrome.runtime.lastError);
                            return;
                        }

                        // Update the popup window info with the zoom factor
                        popupWindowsInfo[originWindowId][updatedWindow.id] = {
                            windowType: updatedWindow.type,
                            top: updatedWindow.top,
                            left: updatedWindow.left,
                            width: updatedWindow.width,
                            height: updatedWindow.height,
                            zoomFactor: zoomFactor
                        };

                        if (configs.rememberPopupSizeAndPosition) {
                            popupWindowsInfo.savedPositionAndSize = {
                                top: updatedWindow.top,
                                left: updatedWindow.left,
                                width: updatedWindow.width,
                                height: updatedWindow.height,
                                zoomFactor: zoomFactor
                            };
                        }

                        // Save the updated info to local storage
                        chrome.storage.local.set({ popupWindowsInfo }, () => {
                            // console.log('Popup window bounds updated:', popupWindowsInfo, zoomFactor);
                        });
                    });
                });

                break;
            }
        }
    });
}

// Listener for popup window removal
function windowRemovedListener(windowId) {
    chrome.storage.local.get('popupWindowsInfo', (result) => {
        const popupWindowsInfo = result.popupWindowsInfo || {};

        for (const originWindowId in popupWindowsInfo) {
            if (popupWindowsInfo[originWindowId][windowId]) {
                console.log('remove',popupWindowsInfo[originWindowId][windowId])
                delete popupWindowsInfo[originWindowId][windowId];

                if (Object.keys(popupWindowsInfo[originWindowId]).length === 0) {
                    console.log('remove',popupWindowsInfo[originWindowId])
                    delete popupWindowsInfo[originWindowId];
                }

                chrome.storage.local.set({ popupWindowsInfo });
                break;
            }
        }
    });
}
