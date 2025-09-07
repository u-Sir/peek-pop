0.0.49
- New option: middle mouse button (scroll wheel) click on a blank area of the page sends page back to the original window.
- New option: popup window size as a percentage of the last window size.
- Refined blur removal behavior on macOS.

0.0.48  
- Updated the InClickMode icon.
- Refined click mask logic.

0.0.47
- Fixed popup positioning on systems with scaling other than 100%.
- Removed the blur effect when the mouse enters the original window.  
- Improved the hold-to-preview functionality.  
- Enhanced the handling of iframes.

0.0.46
- Enhance handling when triggered by non-human clicks.

0.0.45
- Fixed issue where blur duration was not functioning correctly.
- Fixed an issue where "Hold to Preview" did not work in certain cases.
- Improved overall performance.

0.0.42
- **Fixed:** An issue where pressing `Esc` to close a tab would unintentionally trigger on the origin tab after restarting the browser.  
- **Improved:** Attempted to prevent page elements from disappearing in certain cases.  
- **Improved:** `Ctrl + right-click` on non-link elements will now add the current page to the collection (if the collection feature is enabled).  

0.0.39
- Added indicator for trigger.
- Added contact logo.

0.0.37
- Fixed an issue where "Hold to Preview" did not work in certain cases.
- Improved title fetching for collections.
- Display the number of collections on the toolbar icon.

0.0.36
- Rebranded to "Peek Pop" with new logo.
- New feature: collection.
- New feature: show search tooltips for selected text.
- New trigger:
  - clicking on the link to preview.
  - hold the left click to preview.
- New option to search by picture (Google, Bing, Baidu, Yandex only)。
- New option to remember popup window size and positon for each domain.
- New option to  show link indicator when hovering.
- New feature: Link blacklist.
- Remove popup in background on Firefox.

0.0.26
- new options page
- now supports hover to preview.
- now supports export/import configurations.
- added an option to open selected url directly.
- added an option to set double tap specific key to send current popup page back to original window.
- added an option to popup in background.
- added an option to popup selected url in plain text.
- action icon now follows with system theme.

0.0.24
- improved modified key related logic.
- added option to remember the popup window position and size.(Need to click/scroll on popup window page)
- added option to set popup window type. Now you can do anything when set it to 'Normal'.

0.0.21
- ensure that popup window centered based on current screen when tryOpenAtMousePosition is false.
- align the checkboxes/radio buttons with their respective labels properly on options page.
- ensure "send page back" response when idle.
- added Wikipedia in search providers.
- keep options page following system's light/dark mode.

0.0.19
- multi-monitors supported.
- change modified key to optional. (Please test to ensure it meets expectations.)
- prevent trigger click when dragging link/selectedText.
- add options to select search provider or custom.
- new option page.

0.0.17
- add an option to set blur effect on original page when popup window.
- add options page to browser action.

0.0.16
- add option to only response when shift key is pressing.
- add an option to enable "ensured popup window open in the same container as original page".
- add "send page back to original window" in context menu on popup window.

0.0.14
- convert to non-persisten background.
- ensured popup window open in the same container/private-mode as original page on Firefox.

0.0.10
- support disable in specific URLs via regex, wildcard, plain text

0.0.4
- fixed a bug that "Option to search selection in popup enabled" can't be disabled.

0.0.3
- prevent dragged link open in new tab or in original page.

0.0.2
- updated Chinese translation. 
- fixed popup window does not work correctly in private mode.

0.0.1
- initial release, modified based on "open in popup window".
