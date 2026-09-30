class HorizontalBarChart {
    constructor({
        containerId,
        dataScope, //sensitivy or causality
        bars_relative //take relative score or normal value

    }) {
        //height and width for the container = svg
        this.container = document.getElementById(containerId);
        this.containerHeight = this.container.clientHeight;
        this.containerWidth = this.container.clientWidth;

        this.dataScope = dataScope
        this.polarity = "negative" //initialise positive
        this.bar_type_relative = bars_relative

        //height and width for g
        this.margin = { top: 20, right: 30, bottom: 40, left: 40 };
        this.width = this.containerWidth
        this.height = this.containerHeight - this.margin.top - this.margin.bottom;

        // setup SVG
        this.svg = d3.select(`#${containerId}`).append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Scales
        this.x = d3.scaleLinear()
            //.domain([0, 1.1])
            .range([this.margin.left, this.width - this.margin.right]);

        this.y = d3.scaleBand()
            .padding(0.4); //rest of y rendering done in renderChart()


        //map to get name of node from its ID
        this.nameByRef = new Map(elementData.map(d => [d.refCode, d.name]));
        this.getKey = d => d.refCode
        this.duration = 500

        this.latestNodeHighlighted = lastSelectedNode

        this.setLabel(this.latestNodeHighlighted)

        this.rootID = treeData.refCode
        this.rootElem = elementData.filter(e => e.refCode == this.rootID)[0]
        this.rootChartData = this.rootElem[dataScope]
        this.originalOrder = this.rootChartData.map(d => d.refCode)

        //axis group
        this.yAxisG = this.svg.append("g")
            .attr("class", "y-axis")
        //bars and grid group
        this.gridG = this.svg.append("g").attr("class", "grid");
        this.barsG = this.svg.append("g").attr("class", "bars");

        //add score Label
        this.svg.append("text")
            .attr("x", -35)
            .attr("y", 0)
            .text("Score")

        //listeners for chart events
        window.addEventListener("sortBars", () => this.sortBars());
        window.addEventListener("resetBars", () => this.resetBars());
        window.addEventListener("treeChangeNode", (e) => {
            this.latestNodeHighlighted = e.detail

            this.setLabel(this.latestNodeHighlighted)

            this.renderChart({
                curr_node: this.latestNodeHighlighted,
                type: this.polarity
            });
        })
        window.addEventListener("dropToggled", (e) => { //dropdown menu
            this.polarity = (e.detail || "").toLowerCase();
            this.renderChart({ //initial params
                curr_node: this.latestNodeHighlighted,
                type: this.polarity
            });
        })


        //------------tooltip-----------------------------------------

        // Create a tooltip div (hidden by default)
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")

        const MOUSE_POS_OFFSET = 12;


        //helper to set the tooltip position relative to the mouse
        this.positionTooltip = (event) => {
            const node = this.tooltip.node();

            // tooltip size (after .html(...) has been set)
            const rect = node.getBoundingClientRect();
            const tw = rect.width;
            const th = rect.height;

            // cursor in viewport coords (matches position:fixed)
            const cx = event.clientX;
            const cy = event.clientY;

            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // default side: bottom-right of cursor
            let left = cx + MOUSE_POS_OFFSET;
            let top = cy + MOUSE_POS_OFFSET;

            // horizontal flip: if it would overflow right, go to the left of the cursor
            if (left + tw > vw) {
                left = cx - tw - MOUSE_POS_OFFSET;
            }

            // vertical flip: if it would overflow bottom, go above the cursor
            if (top + th > vh) {
                top = cy - th - MOUSE_POS_OFFSET;
            }

            this.tooltip
                .style("left", `${left}px`)
                .style("top", `${top}px`);
        };

    }

    update(nodeId) {
        this.latestNodeHighlighted = nodeId

        this.renderChart({
            curr_node: this.latestNodeHighlighted,
            type: "negative"
        });


    }

    renderChart(data) {

        this.data = this.rootChartData;
        this.polarity = data.type

        //get vars
        let curr_node = data.curr_node
        let curr_node_data = elementData.filter(e => e.refCode == curr_node)[0]
        this.curr_succes = curr_node_data.probability.success
        let scoreMap = new Map(curr_node_data[this.dataScope].map(d => [d.refCode, d.score]))

        //data from vars
        this.chartData = curr_node_data[this.dataScope].map(d => {
            const score = scoreMap.get(d.refCode);
            return {
                refCode: d.refCode,
                node_succes: this.curr_succes,
                node_fail: curr_node_data.probability.fail,
                pos_score_rel: score.success - this.curr_succes, //relative score to the current succes
                neg_score_rel: this.curr_succes - score.fail,
                pos_score_raw: score.success,
                neg_score_raw: score.fail,
                parentID: curr_node

            }
        })

        // Set x domain
        this.setXDomain();
        // if (this.bar_type_relative) {

        //     // Relative graph: negative/weird values may exist
        //     const barVal = this.polarity === "negative"
        //         ? "neg_score_rel"
        //         : "pos_score_rel";

        //     const minValue = d3.min(
        //         this.chartData,
        //         d => d[barVal]
        //     );

        //     // Round DOWN to nearest 0.1
        //     this.domainMin = Math.min(
        //         0,
        //         Math.floor((minValue ?? 0) * 10) / 10
        //     );

        //     this.x.domain([this.domainMin, 1.1]);

        // } else {

        //     // Raw graph: values are always between 0 and 1
        //     this.domainMin = 0;

        //     this.x.domain([0, 1.1]);
        // }

        //set up range for y
        this.y
            .domain(this.data.map(this.getKey))
            .range([0, this.height - this.margin.bottom]);


        //rendering of chart
        this.drawGrid();
        this.drawAxis();
        this.drawBars();
    }

    setXDomain() {

        if (this.bar_type_relative) {

            const barVal = this.polarity === "negative"
                ? "neg_score_rel"
                : "pos_score_rel";

            const minValue = d3.min(
                this.chartData,
                d => d[barVal]
            );

            this.domainMin = Math.min(
                0,
                Math.floor((minValue ?? 0) * 10) / 10
            );

            this.x.domain([this.domainMin, 1.1]);

        } else {

            this.domainMin = 0;
            this.x.domain([0, 1.1]);
        }
    }


    drawGrid() {

        const [min, max] = this.x.domain();

        const ticks = d3.range(
            Math.round(min * 10),
            Math.round(max * 10) + 1
        ).map(d => d / 10);


        this.gridG
            .call(
                d3.axisTop(this.x)
                    .tickValues(ticks)
                    .tickFormat(d3.format(".1f"))
            )
            .call(g => g.selectAll(".tick line")
                .attr("y2", this.height - this.margin.bottom)
                .attr("stroke-opacity", 0.1))
            .call(g => g.select(".domain").remove());

    }


    drawAxis() {
        this.yAxisG
            .attr("transform", `translate(${this.x(0)},0)`)
            .call(
                d3.axisRight(this.y)
                    .tickSize(0)
                    .tickPadding(6)
                    .tickFormat(d => this.nameByRef.get(d) || d)
            );
    }


    drawBars() {

        let barVal;

        if (this.bar_type_relative) {
            barVal = this.polarity === "negative" ? "neg_score_rel" : "pos_score_rel";
        } else {
            barVal = this.polarity === "negative" ? "neg_score_raw" : "pos_score_raw";
        }


        //polarity map
        const keyFn = d => `${this.polarity}-${this.getKey(d)}`;

        const bars = this.barsG
            .selectAll("rect")
            .data(this.chartData, keyFn);

        //exit old bars
        bars.exit()
            .transition()
            .duration(this.duration)
            .attr("width", 0)
            .remove();

        //enter new bars
        const barsEnter = bars.enter()
            .append("rect")
            .classed("rect", true)
            .attr("x", this.x(0))
            .attr("y", d => this.y(this.getKey(d)))
            .attr("height", this.y.bandwidth())
            .attr("width", 0);


        const merged = barsEnter.merge(bars);

        merged
            .classed("rect", true)
            .classed("positive", d => this.polarity === "positive")
            .classed("negative", d => this.polarity === "negative")
            .classed("weird", d => d[barVal] < 0);

        merged
            .transition()
            .duration(this.duration)
            .attr("x", d => {
                const value = d[barVal] ?? 0;

                if (value < 0) {
                    // weird: starts at negative value
                    return this.x(value);
                } else {
                    // normal: starts at zero
                    return this.x(0);
                }
            })
            .attr("y", d => this.y(this.getKey(d)))
            .attr("width", d => {
                const value = d[barVal] ?? 0;

                if (value < 0) {
                    // weird: negative value -> zero
                    return this.x(0) - this.x(value);
                } else {
                    // normal: zero -> positive value
                    return this.x(value) - this.x(0);
                }
            });

        //get score map for axis values
        const scoreByRef = new Map(
            this.chartData.map(d => [
                d.refCode,
                d[barVal] ?? 0
            ])
        );

        //Score values
        this.yAxisG.selectAll(".tick")
            .selectAll(".tick-score")
            .data(d => [d]) // one label per tick
            .join("text")
            .attr("class", "tick-score")
            // .attr("x", -75)
            .attr("x", -30 - this.x(0))
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .text(d => {
                const score = scoreByRef.get(d);
                return score === undefined || score === null
                    ? "" //no text if bar doesnt exist                     
                    : score.toFixed(3); //display score incl 0      
            });


        this.drawTooltip(this.dataScope)


    }


    sortBars() {

        let barVal;

        if (this.bar_type_relative) {
            barVal = this.polarity === "negative" ? "neg_score_rel" : "pos_score_rel";
        } else {
            barVal = this.polarity === "negative" ? "neg_score_raw" : "pos_score_raw";
        }

        const valueByRef = new Map(
            this.chartData.map(d => [
                d.refCode,
                d[barVal] ?? 0
            ])
        );

        const sortedDomain = [...this.originalOrder]
            .sort((a, b) => {
                const va = valueByRef.get(a)
                const vb = valueByRef.get(b)

                //check if bars exist
                const aExists = va !== undefined && va !== null;
                const bExists = vb !== undefined && vb !== null;

                //existing bar always gets sorted above non-existing bar
                if (aExists && !bExists) return -1;
                if (!aExists && bExists) return 1;

                //if both are missing, keep original order
                if (!aExists && !bExists) return 0;


                return vb - va; // descending
            });

        //new domain based on sorted values
        this.y.domain(sortedDomain);

        //animate existing bars
        this.barsG.selectAll("rect")
            .transition()
            .duration(this.duration)
            .attr("y", d => this.y(d.refCode));

        //redraw axis
        this.drawAxis();
    }


    resetBars() {
        this.y.domain(this.originalOrder);

        this.barsG.selectAll("rect")
            .transition()
            .duration(this.duration)
            .attr("y", d => this.y(d.refCode));

        this.drawAxis();
    }

    setLabel(nodeID) {
        let nodeLabel = this.nameByRef.get(nodeID)
        document.getElementById("selectedNodeLabel").textContent = nodeLabel;
    }

    drawTooltip(dataScope) {

        this.barsG.selectAll('.rect')
            .on("mouseover", (event, d) => {
                const isPositive = d3.select(event.currentTarget).classed("positive");
                const isNegative = d3.select(event.currentTarget).classed("negative");

                let parentID = d.parentID
                let parentName = this.nameByRef.get(parentID)
                let parentSuccess = d.node_succes.toFixed(3)
                let parentFail = d.node_fail.toFixed(3)
                let leafName = this.nameByRef.get(d.refCode)

                console.log(d)

                if (dataScope === "sensitivity") { //bars for the 3-point and criticality charts

                    if (isPositive) {

                        let forced_leaf_succes = d.pos_score_raw.toFixed(3)
                        let forced_leaf_fail = (1 - d.pos_score_raw).toFixed(3)
                        let increasePercentage = ((forced_leaf_succes - parentSuccess) / parentSuccess * 100).toFixed(1)

                        let percentage = increasePercentage >= 0 ? increasePercentage : Math.abs(increasePercentage)
                        let arrow = increasePercentage >= 0 ? '&#129109' : '&#129110'
                        let colour = increasePercentage >= 0 ? 'MediumSeaGreen' : 'Tomato'



                        this.tooltip
                            .style("opacity", 1)
                            .style("display", "block")
                            .style("transform", null)
                            .html(`<span style='font-size: 13px;'>${parentName}:
                                      <span style='color:MediumSeaGreen'>${parentSuccess}</span>/<span style='color:Tomato'>${parentFail}</span> </span>
                                      <br><span><u>On '${leafName}' success:</u></span> (${arrow}<span style='color:${colour}'>${percentage}%</span>)<br>
                                      <span>${parentName}: <span style='color:MediumSeaGreen'>${forced_leaf_succes}</span>/<span style='color:Tomato'>${forced_leaf_fail}</span>
                                      </span><br>`)

                    } else if (isNegative) {

                        let forced_leaf_succes = d.neg_score_raw.toFixed(3)
                        let forced_leaf_fail = (1 - d.neg_score_raw).toFixed(3)
                        let decreasePercentage = ((parentSuccess - forced_leaf_succes) / parentSuccess * 100).toFixed(1)

                        let percentage = decreasePercentage >= 0 ? decreasePercentage : Math.abs(decreasePercentage)
                        let arrow = decreasePercentage >= 0 ? '&#129110' : '&#129109'
                        let colour = decreasePercentage >= 0 ? 'Tomato' : 'MediumSeaGreen'

                        this.tooltip
                            .style("opacity", 1)
                            .style("display", "block")
                            .style("transform", null)
                            .html(`<span style='font-size: 13px;'>${parentName}:
                                       <span style='color:MediumSeaGreen'>${parentSuccess}</span>|<span style='color:Tomato'>${parentFail}</span> </span>
                                       <br><span><u>On '${leafName}' failure:</u></span> (${arrow}<span style='color:${colour}'>${percentage}%</span>)<br>
                                       <span>${parentName}: <span style='color:MediumSeaGreen'>${forced_leaf_succes}</span>|<span style='color:Tomato'>${forced_leaf_fail}</span>
                                       <br>`)
                    }


                } else if (dataScope === "causality") { //tooltip for causality bars
                    if (isNegative) {
                        let leaf_fail_rate = (d.neg_score_raw * 100).toFixed(2)

                        this.tooltip
                            .style("opacity", 1)
                            .style("display", "block")
                            .style("transform", null)
                            .html(`<span style='font-size: 13px;'>When ${parentName} fails: </span><br>
                                        <span><u>'${leafName}'</u> failure rate: <span style='color:Tomato'>${leaf_fail_rate}%</span></span>`)
                    }
                }
                this.positionTooltip(event);
            })
            .on("mousemove", (event) => {
                this.positionTooltip(event);
            })
            .on("mouseout", () => {
                this.tooltip
                    .style("opacity", 0)
                    .style("display", "none");
            });
    }

}