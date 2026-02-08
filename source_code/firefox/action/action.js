function handleLinkClick(e) {
    e.preventDefault(); // Prevent the default link behavior

    const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
    const linkUrl = linkElement ? linkElement.href : null;

    if (linkUrl) {
        const group = {
            linkUrl: linkUrl,
            lastClientX: e.screenX,
            lastClientY: e.screenY,
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            top: window.screen.availTop,
            left: window.screen.availLeft,
            trigger: 'click'
        };

        chrome.runtime.sendMessage(group, () => {
            handleRemoveLink(linkUrl, () => {
                window.close(); // Close the window after handleRemoveLink completes
            });
        });
    }
}

function openAllAndClearCollection(e) {
    chrome.storage.local.get(['collection'], (result) => {
        let collection = result.collection || []; // Ensure collection is an array

        // Re-fetch the collection to make sure we have the latest data
        chrome.storage.local.get(['collection'], (updatedResult) => {
            collection = updatedResult.collection || []; // Use the latest collection data

            // Check if there is a second item in the collection
            if (collection.length > 1 && collection[1].links && collection[1].links.length > 0) {
                const group = {
                    action: 'group',
                    links: collection[1].links, // Get the links from the second item
                    trigger: 'group',
                    lastClientX: e.clientX,
                    lastClientY: e.clientY,
                    width: window.screen.availWidth,
                    height: window.screen.availHeight,
                    top: window.screen.availTop,
                    left: window.screen.availLeft
                };

                chrome.runtime.sendMessage(group, () => {
                    // Remove all items from the collection except for the '+' item
                    const updatedCollection = collection.filter(item => item.label === '+');

                    // Store the updated collection back in Chrome storage
                    chrome.storage.local.set({ collection: updatedCollection }, () => {
                        loadLinks();
                        window.close();
                    });

                    chrome.runtime.sendMessage({ action: 'updateBadge' });

                });
            } else {
                // console.log('No links to open or insufficient items in the collection.');
            }
        });
    });
}


function handleRemoveLink(linkUrl, callback) {
    chrome.storage.local.get(['collection'], (result) => {
        let collection = result.collection || [];

        // Filter out the specific link from the main collection
        collection = collection.filter(item => item.url !== linkUrl);

        // Check if the second item in the collection has a links array
        if (collection.length > 1 && collection[1].links) {
            // Remove the link from the links array in the second item
            collection[1].links = collection[1].links.filter(links => links.url !== linkUrl);

            // If the links array is empty, remove the second item from the collection
            if (collection[1].links.length === 0) {
                collection.splice(1, 1);
            }
        }

        // Store the updated collection back in Chrome storage
        chrome.storage.local.set({ collection: collection }, () => {

            // Check if there are no links left after removal
            if (collection.length === 1 && (!collection[0].links || collection[0].links.length === 0)) {
                // Redirect to options.html if no links remain
                window.location.href = '../options/options.html';
            } else {
                loadLinks(); // Reload the links after removing
            }

            chrome.runtime.sendMessage({ action: 'updateBadge' });

            if (callback) callback(); // Invoke the callback if provided
        });
    });
}



function loadLinks() {
    chrome.storage.local.get(['collection'], (result) => {
        const collection = result.collection || [];
        const linksContainer = document.getElementById('links');
        const emptyMessage = document.getElementById('empty');
        linksContainer.innerHTML = ''; // Clear previous links

        let hasLinks = false;

        // Loop through the collection and create link elements
        collection.forEach((link, index) => {
            if (index === 0) return; // Skip the first item

            hasLinks = true; // If we have at least one link, set hasLinks to true

            const linkContainer = document.createElement('div'); // Create a container for each link and its button
            linkContainer.classList.add('link-container'); // Add a class for styling

            if (index !== 1) { // Add the remove button only if index is not 1
                const removeButton = document.createElement('button');
                removeButton.classList.add('remove-button'); // Add a class for styling
                removeButton.addEventListener('click', function () {
                    handleRemoveLink(link.url);
                });
                linkContainer.appendChild(removeButton); // Append the button to the link container
            }

            const a = document.createElement('a');
            a.href = link.url;
            a.textContent = link.label || link.url;
            a.target = '_blank';

            if (index === 1) {
                // Create "Open all" link
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    openAllAndClearCollection(e);
                });
                a.textContent = chrome.i18n.getMessage('openAll');
                a.classList.add('left-link'); // Add a specific class for styling
                linkContainer.appendChild(a);

                // Create "Clear all" link
                const clearLink = document.createElement('a');
                clearLink.href = '#'; // Use a placeholder href for the link
                clearLink.textContent = chrome.i18n.getMessage('clearAll');
                clearLink.classList.add('center-link'); // Add a specific class for styling
                clearLink.addEventListener('click', function (e) {
                    e.preventDefault();
                    // Remove all items except the first one
                    chrome.storage.local.get(['collection'], (result) => {
                        const collection = result.collection || [];
                        const updatedCollection = [collection[0]]; // Keep only the first item
                        chrome.storage.local.set({ collection: updatedCollection }, () => {
                            loadLinks(); // Reload the links after clearing

                            chrome.runtime.sendMessage({ action: 'updateBadge' });
                        });
                    });
                });
                linkContainer.appendChild(clearLink);

                // Create "Options" link to redirect to options.html
                const optionsLink = document.createElement('a');
                optionsLink.href = '../options/options.html';
                optionsLink.textContent = chrome.i18n.getMessage('options');
                optionsLink.style.marginLeft = '10px'; // Add some space between the links
                optionsLink.classList.add('right-link'); // Add a specific class for styling
                linkContainer.appendChild(optionsLink); // Append the options link to the link container
            } else if (index > 1) {
                // Attach the standard click handler to other items
                a.addEventListener('click', function (e) {
                    handleLinkClick(e);
                });
                linkContainer.appendChild(a); // Append the link to the link container
            }

            // Append the link container to the links container
            linksContainer.appendChild(linkContainer);
        });

        // Show or hide the empty message based on whether there are any links
        if (hasLinks) {
            emptyMessage.style.display = 'none'; // Hide the empty message if there are links
        } else {
            emptyMessage.style.display = 'block'; // Show the empty message if there are no links
            emptyMessage.textContent = chrome.i18n.getMessage('empty'); // Set your desired message here

            // Redirect to options.html if no links exist
            window.location.href = '../options/options.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    chrome.storage.local.get(['collectionEnable'], (result) => {
        const collectionEnable = result.collectionEnable;

        if (!collectionEnable) {
            // Redirect to options.html
            window.location.href = '../options/options.html';
        } else {
            // Continue with the rest of the code if collectionEnable is true
            loadLinks(); // or any other function you want to run
        }
    });
});
