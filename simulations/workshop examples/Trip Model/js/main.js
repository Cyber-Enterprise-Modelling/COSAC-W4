let treeData
let elementData
let lastSelectedNode
let sensChart = null
let causChart = null
let critChart = null


d3.json("data/tree.json").then(function (data) {
    treeData = data
    d3.json("data/elements.json").then(function (data) {

        elementData = data

        initialiseTooltips(); //tooltip file

        //---get last highlighted tree node------------------
        if (lastSelectedNode == null) lastSelectedNode = treeData.refCode;

        //listeners for tree node selection
        window.addEventListener("treeChangeNode", (e) => {
            resetSortSwitch()
            lastSelectedNode = e.detail});

        const tree = new Tree("dependency-tree");

        //TODO: see if expanded from getgo
        //tree.expandAll()
        
        showSensitivityChart()

        //----listeners for the chart----------------------------------

        //listener for the selection of the right charts
        document.querySelectorAll('#right-chart-selector-buttons input[name="options"]')
            .forEach(input => {
                input.addEventListener("change", () => {

                    // reset sort switch
                    resetSortSwitch()

                    switchRightChartById(input.id);
                });
            });

        //sort switch listener
        document.getElementById("sortSwitch").addEventListener("click", function (event) {

            let switchEvent
            event.target.checked ?
                switchEvent = new CustomEvent("sortBars", { detail: "eh" }) : switchEvent = new CustomEvent("resetBars", { detail: "eh" })

            window.dispatchEvent(switchEvent);
        })

        //dropdown toggle for pos/neg values
        document.getElementById("critModeSelect").addEventListener("change", function (event) {

            // reset sort switch
            resetSortSwitch()

            let dropEvent = new CustomEvent("dropToggled", { detail: event.target.value })

            window.dispatchEvent(dropEvent);
        })
        document.getElementById("causModeSelect").addEventListener("change", function (event) {

            // reset sort switch
            resetSortSwitch()

            let dropEvent = new CustomEvent("dropToggled", { detail: event.target.value })

            window.dispatchEvent(dropEvent);
        })
    })
})



//check if svg already exists in chart
function containerHasSVG() {
    const container = document.getElementById("right-charts");
    return container && container.querySelector("svg") !== null;
}

//-------------------creation of each chart ----------------------------------------------------
function createSensChartNow() {
    // create and store instance
    sensChart = new DualBarChart({ containerId: "right-charts", dataScope: "sensitivity" , bars_relative: true})
    if (typeof sensChart.update === "function") sensChart.update(lastSelectedNode);
}

function createCausChartNow() {
    causChart = typeof HorizontalBarChart !== "undefined" ? new HorizontalBarChart({ containerId: "right-charts", dataScope: "causality", bars_relative: false }) : null;
    if (causChart && typeof causChart.update === "function") causChart.update(lastSelectedNode);
}

function createCritChartNow() {
    critChart = typeof HorizontalBarChart !== "undefined" ? new HorizontalBarChart({ containerId: "right-charts", dataScope: "sensitivity", bars_relative: true }) : null;
    if (critChart && typeof critChart.update === "function") critChart.update(lastSelectedNode);
}


// ---helper to clear the chart container---
function clearRightChartsContainer() {
    const container = document.getElementById("right-charts");
    if (!container) return;
    container.innerHTML = "";
}


// ---------- show chart functions ----------
function showSensitivityChart() {
    const container = document.getElementById("right-charts");
    if (!container) return;

    // If sensChart exists and container still has its SVG, just update and return
    if (sensChart && containerHasSVG()) {
        if (typeof sensChart.update === "function") sensChart.update();
        return;
    }

    // Otherwise (no instance or its DOM removed) recreate it
    clearRightChartsContainer();
    if (typeof DualBarChart !== "undefined") {
        // delay creation until next layout tick so container sizes are accurate
        requestAnimationFrame(() => createSensChartNow());
        return;
    }

    // fallback placeholder
    d3.select("#right-charts").append("svg")
        .attr("width", 600).attr("height", 300)
        .append("text").attr("x", 20).attr("y", 40).text("3-point Sensitivity (placeholder)");
}

function showCausalityChart() {
    const container = document.getElementById("right-charts");
    if (!container) return;

    if (causChart && containerHasSVG()) {
        if (typeof causChart.update === "function") causChart.update(lastSelectedNode);
        return;
    }

    clearRightChartsContainer();
    if (typeof HorizontalBarChart !== "undefined") {
        requestAnimationFrame(() => createCausChartNow());
        return;
    }

    d3.select("#right-charts").append("svg")
        .attr("width", 600).attr("height", 300)
        .append("text").attr("x", 20).attr("y", 40).text("Causality (placeholder)");
}

function showCriticalityChart() {
    const container = document.getElementById("right-charts");
    if (!container) return;

    if (critChart && containerHasSVG()) {
        if (typeof critChart.update === "function") critChart.update(lastSelectedNode);
        return;
    }

    clearRightChartsContainer();
    if (typeof HorizontalBarChart !== "undefined") {
        requestAnimationFrame(() => createCritChartNow());
        return;
    }

    d3.select("#right-charts").append("svg")
        .attr("width", 600).attr("height", 300)
        .append("text").attr("x", 20).attr("y", 40).text("Criticality (placeholder)");
}

// master switch helper
function switchRightChartById(optionId) {
    // clear existing drawing (some chart classes may draw into existing SVG, but safe to clear)
    clearRightChartsContainer();

    toggleModeDropdown("crit", optionId === "crit")//shows dropdown on crit chart
    toggleModeDropdown("caus", optionId === "caus")//shows dropdown on crit chart


    if (optionId === "3point") {
        showSensitivityChart();
    } else if (optionId === "caus") {
        showCausalityChart();
    } else if (optionId === "crit") {
        showCriticalityChart();
    } else {
        console.warn("Unknown chart optionId:", optionId);
    }
}

function resetSortSwitch() {
    const sortSwitch = document.getElementById("sortSwitchInput");
    if (sortSwitch) {
        sortSwitch.checked = false;
    }
}

function toggleModeDropdown(chart, show) {
    const el = document.getElementById(`${chart}ModeDropdown`);
    if (!el) return;

    if (show) {
        el.classList.remove("d-none");
    } else {
        el.classList.add("d-none");

        //reset when hidden
        const input = document.getElementById(`${chart}ModeSelect`);
        if (input) input.value = "negative";
    }
}