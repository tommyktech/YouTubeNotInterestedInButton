// ==UserScript==
// @name         DIYYouTubeNotInterestedButton
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add "Not Interested" button to all video thumbnails on YouTube version
// @author       Your Name
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to add "Not Interested" button
    function addNotInterestedButton() {
        const videoThumbnails = document.querySelectorAll('ytd-rich-item-renderer');

        videoThumbnails.forEach(thumbnail => {
            if (!thumbnail.querySelector('.not-interested-button')) {
                const button = document.createElement('button');
                button.className = 'not-interested-button';
                button.style.position = 'absolute';
                button.style.bottom = '-5px';
                button.style.right = '8px';
                button.style.zIndex = '10000';
                button.style.color = 'white';
                button.style.backgroundColor = 'transparent';
                button.style.border = 'none';
                button.style.padding = '5px';
                button.style.cursor = 'pointer';

                // Create the SVG element
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("height", "24");
                svg.setAttribute("stroke", "white");
                svg.setAttribute("viewBox", "0 0 24 24");
                svg.setAttribute("width", "24");
                svg.setAttribute("focusable", "false");
                svg.setAttribute("style", "color:white;pointer-events: none; display: inherit; width: 100%; height: 100%;");

                // Create the path element
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", "M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zM3 12c0 2.31.87 4.41 2.29 6L18 5.29C16.41 3.87 14.31 3 12 3c-4.97 0-9 4.03-9 9zm15.71-6L6 18.71C7.59 20.13 9.69 21 12 21c4.97 0 9-4.03 9-9 0-2.31-.87-4.41-2.29-6z");
                path.setAttribute("fill-rule", "evenodd");

                // Append the path to the SVG
                svg.appendChild(path);

                // Append the SVG to the button
                button.appendChild(svg);

                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    event.preventDefault();

                    // Simulate "Not Interested" action
                    const menuButton = thumbnail.querySelector('yt-lockup-metadata-view-model:nth-child(1) > div:nth-child(3) > button-view-model:nth-child(1) > button:nth-child(1)');
                    console.log("fuck menuButton:", menuButton)
                    if (menuButton) {
                        menuButton.click();
                        setTimeout(() => {
                            const notInterestedButton = document.querySelector('yt-list-item-view-model.yt-list-item-view-model:nth-child(6) > div:nth-child(1)');
                            console.log("fuck notInterestedButton:", notInterestedButton)

                            if (notInterestedButton) {
                                notInterestedButton.click();
                            }
                        }, 200);
                    }
                });

                thumbnail.style.position = 'relative';
                thumbnail.appendChild(button);
            }
        });
    }

    // Observe changes in the DOM to add buttons dynamically
    const observer = new MutationObserver(addNotInterestedButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial call to add buttons
    addNotInterestedButton();
})();
