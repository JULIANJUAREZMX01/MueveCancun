    <script>
      function enforceTutorial() {
        const path = window.location.pathname;
        const isTutorialPage = path === "/" || path === "" || path === "/index.html" || path.endsWith("/index.html");
        const isStaticAsset = (path.includes(".") && !path.endsWith(".html")) || path.startsWith("/_astro") || path.startsWith("/data/");

        if (isTutorialPage || isStaticAsset) return;

        const isCompleted = document.cookie.includes("tutorial_completed=true") || localStorage.getItem("tutorial_completed") === "true";

        if (!isCompleted) {
          console.warn("[MueveCancun] Tutorial not completed, redirecting to root.");
          window.location.href = "/";
        }
      }

      enforceTutorial();
      document.addEventListener("astro:after-swap", enforceTutorial);
    </script>
