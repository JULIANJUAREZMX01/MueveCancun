import sys

with open("src/components/RouteCalculator.astro", "r") as f:
    content = f.read()

old_str = """          // Sentinel Security Fix: Retry Button Delegation
          if (target.closest('.js-retry-search-btn')) {
              setTimeout(() => document.getElementById('origin-input')?.focus(), 50);
          }"""

new_str = """          // Sentinel Security Fix: Retry Button Delegation
          const retryBtn = target.closest('.js-retry-search-btn');
          if (retryBtn) {
              e.preventDefault();
              setTimeout(() => {
                  const originInput = document.getElementById('origin-input');
                  if (originInput) {
                      originInput.focus();
                  }
              }, 50);
          }"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open("src/components/RouteCalculator.astro", "w") as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("String not found. Check exact formatting.")
