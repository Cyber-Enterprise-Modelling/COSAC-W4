//additional tooltips
function initialiseTooltips() {

    const tooltip = document.createElement("div");
    tooltip.className = "static-tooltip";

    document.body.appendChild(tooltip);

    const MOUSE_POS_OFFSET = 12;

    function positionTooltip(event) {

        const rect = tooltip.getBoundingClientRect();

        const tw = rect.width;
        const th = rect.height;

        const cx = event.clientX;
        const cy = event.clientY;

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = cx + MOUSE_POS_OFFSET;
        let top = cy + MOUSE_POS_OFFSET;

        // Prevent overflow on right
        if (left + tw > vw) {
            left = cx - tw - MOUSE_POS_OFFSET;
        }

        // Prevent overflow at bottom
        if (top + th > vh) {
            top = cy - th - MOUSE_POS_OFFSET;
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }


    document.querySelectorAll("[data-tooltip]").forEach(element => {

        element.addEventListener("mouseenter", event => {

            tooltip.textContent = element.dataset.tooltip;

            tooltip.style.opacity = 1;
            tooltip.style.display = "block";

            positionTooltip(event);
        });


        element.addEventListener("mousemove", event => {
            positionTooltip(event);
        });


        element.addEventListener("mouseleave", () => {

            tooltip.style.opacity = 0;
            tooltip.style.display = "none";
        });

    });
}