        function checkTutorial() {
            const path = window.location.pathname;
            const isRoot = path === "/" || path === "" || path === "/index.html" || path.endsWith("/index.html");
            if (!isRoot) return;

            const hasCookie = document.cookie.includes('tutorial_completed=true');
            const hasStorage = localStorage.getItem('tutorial_completed') === 'true';

            if (hasCookie || hasStorage) {
                const savedLang = localStorage.getItem('lang') || 'es';

                // Sync state to prevent loops if one is missing
                if (hasStorage && !hasCookie) {
                    document.cookie = "tutorial_completed=true; path=/; max-age=31536000; SameSite=Lax";
                    document.cookie = "locale=" + encodeURIComponent(savedLang) + "; path=/; max-age=31536000; SameSite=Lax";
                }

                window.location.href = "/" + savedLang + "/home";
            }
        }
