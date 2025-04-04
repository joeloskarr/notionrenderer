// Only needed for Twitter Embeds to make them the right size.
document.addEventListener('DOMContentLoaded', () => {

    /// Equations ////////////////////////////////////////

    // Function to load MathJax
    const loadMathJax = () => {
        if (document.querySelector('.notion-page-content')) {
            const mathJaxScript = document.createElement('script');
            mathJaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            mathJaxScript.async = true;
            mathJaxScript.onload = () => {
                console.log('MathJax loaded');
                MathJax = {
                    tex: {
                        inlineMath: [['\\(', '\\)']],
                        displayMath: [['\\[', '\\]']]
                    },
                    svg: {
                        fontCache: 'global'
                    },
                    options: {
                        renderActions: {
                            addCSS: [10, (doc) => {
                                const style = document.createElement('style');
                                style.textContent = `
                                    .mjx-container {
                                        overflow-wrap: break-word;
                                        word-wrap: break-word;
                                        white-space: normal !important;
                                        max-width: 100%;
                                    }
                                    .mjx-container svg {
                                        max-width: 100%;
                                        height: auto;
                                    }
                                `;
                                document.head.appendChild(style);
                            }, '', false]
                        }
                    }
                };
            };
            document.head.appendChild(mathJaxScript);
        }
    };

    // Observe DOM changes to detect when notion-page-content is rendered
    const observer = new MutationObserver(() => {
        if (document.querySelector('.notion-page-content')) {
            loadMathJax();
            observer.disconnect(); // Stop observing once MathJax is loaded
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    /// Twitter Embeds ////////////////////////////////////////

    const processedIds = new Set();


    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
        //console.log('Received message:', event.data);

        // Handle messages with specific structure
        if (event.data && event.data['twttr.embed']) {
            const embedData = event.data['twttr.embed'];
            //console.log('Twitter embed message:', embedData);

            if (embedData.method === 'twttr.private.resize' && embedData.params && embedData.params[0]) {
                const { height, width } = embedData.params[0];
                const id = embedData.params[0].data.tweet_id;

                if (!processedIds.has(id)) {
                    processedIds.add(id);
                    const iframe = document.querySelector(`#if-${id}`);
                    if (iframe) {
                        iframe.style.height = `${height}px`;
                        iframe.style.width = `${width}px`;
                    }
                }
            }
        }
    });

});
