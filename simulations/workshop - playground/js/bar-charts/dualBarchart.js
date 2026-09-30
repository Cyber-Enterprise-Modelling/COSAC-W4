class DualBarChart extends HorizontalBarChart {
    drawAxis() {
        //dual barchart axis based on selected node success
        this.yAxisG
            .attr("transform", `translate(${this.x(this.curr_succes)},0)`)
            .call(
                d3.axisLeft(this.y)
                    .tickSize(0)
                    .tickPadding(6)
                    .tickFormat(d => this.nameByRef.get(d) || d)
            );

    }

    drawBars() {

        const baselineX = this.x(this.curr_succes);

        const epsilon = 0.1 //value for smooth animation


        //-------------------------positive bars------------------------------
        const posBars = this.barsG
            .selectAll("rect.positive")
            .data(this.chartData, d => d.refCode);

        //remove old bars
        posBars.exit()
            .transition()
            .duration(this.duration)
            .attr("width", 0)
            .remove();

        //enter pos bars normal
        const posBarsEnter = posBars.enter()
            .append("rect")
            .attr("class", "rect positive")
            .attr("x", baselineX)
            .attr("y", d => this.y(this.getKey(d)))
            .attr("height", this.y.bandwidth())
            .attr("width", 0);

        const posMerged = posBarsEnter.merge(posBars);

        posMerged
            .classed("weird", d => d.pos_score_rel < 0);

        posMerged
            .transition()
            .duration(this.duration)

            .attr("x", d => {
                if (d.pos_score_rel < 0) {
                    return this.x(
                        this.curr_succes + d.pos_score_rel
                    );
                }

                return baselineX;
            })

            .attr("y", d =>
                this.y(this.getKey(d))
            )

            .attr("width", d => {
                const endX = this.x(
                    this.curr_succes + d.pos_score_rel
                );

                if (d.pos_score_rel < 0) {
                    // weird positive extends left
                    return baselineX - endX;
                }

                // normal positive extends right
                return endX - baselineX;
            });

        //-----------------------negative bars----------------------------



        const negBars = this.barsG
            .selectAll("rect.negative")
            .data(this.chartData, d => d.refCode)

        negBars.exit()
            .transition()
            .duration(this.duration)
            .attr("width", 0)
            .remove();

        //enter neg bars
        const negBarsEnter = negBars.enter()
            .append("rect")
            .attr("class", "rect negative")
            .attr("x", baselineX - epsilon)
            .attr("y", d => this.y(this.getKey(d)))
            .attr("height", this.y.bandwidth())
            .attr("width", 0);

        const negMerged = negBarsEnter.merge(negBars);

        negMerged
            .classed("weird", d => d.neg_score_rel < 0);

        negMerged
            .transition()
            .duration(this.duration)
            .attr("x", d => {
                if (d.neg_score_rel > 0) {
                    return this.x(
                        this.curr_succes - d.neg_score_rel
                    );
                }
                return baselineX;
            })
            .attr("y", d => this.y(this.getKey(d)))
            .attr("width", d => {
                const endX = this.x(this.curr_succes - d.neg_score_rel);
                if (d.neg_score_rel > 0) {
                    // normal negative extends left
                    return baselineX - endX;
                }
                // weird negative extends right
                return endX - baselineX;
            });

        //get score map for axis values
        const scoreByRef = new Map(
            this.chartData.map(d => [
                d.refCode,
                d.pos_score_rel + d.neg_score_rel ?? 0
            ])
        );

        //Score values
        this.yAxisG.selectAll(".tick")
            .selectAll(".tick-score")
            .data(d => [d]) // one label per tick
            .join("text")
            .attr("class", "tick-score")
            .attr("x", -30 - baselineX)
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

        //value map for scores
        const valueByRef = new Map(
            this.chartData.map(d => [
                d.refCode,
                d.pos_score_rel + d.neg_score_rel ?? 0
            ])
        );

        //sort by value
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
        //change axis domain
        this.y.domain(sortedDomain);

        //animate existing bars
        this.barsG.selectAll("rect")
            .transition()
            .duration(this.duration)
            .attr("y", d => this.y(d.refCode));

        //redraw axis
        this.drawAxis();
    }
}