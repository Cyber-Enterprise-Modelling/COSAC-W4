class Tree {

  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.containerHeight = this.container.clientHeight;
    this.containerWidth = this.container.clientWidth;

    this.margin = { top: 0, right: 20, bottom: 80, left: 20 };
    this.width = this.containerWidth - this.margin.left - this.margin.right;
    this.height = this.containerHeight - this.margin.top - this.margin.bottom;

    this.i = 0;
    this.duration = 750;
    this.root = null; 
    this.elementsData = elementData;


    // setup SVG
    this.svg = d3.select(`#${containerId}`).append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    // tree layout
    this.treemap = d3.tree().size([this.height, this.width]);


    // load tree data
    this.root = d3.hierarchy(treeData, d => d.children);
    this.root.x0 = this.height / 2;
    this.root.y0 = 0;


    if (this.root.children) {
      this.root.children.forEach(child => this.collapse(child));
    }

    this.update(this.root);


    // add legend
    this.drawLegend();

    // Create a tooltip div (hidden by default)
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")

  }


  // collapsing functionality
  collapse = (d) => {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(child => this.collapse(child));
      d.children = null;
    }
  };

  // expanding functionality
  expand = (d) => {
    if (d._children) {
      d.children = d._children;
      d._children = null;
    }

    if (d.children) {
      d.children.forEach(child => this.expand(child));
    }
  };

  expandAll() {
    this.expand(this.root);
    this.update(this.root);
  }

  //legend for the gates
  drawLegend() {
    const legend = this.svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(10, 10)");

    const legendData = [
      // { type: "AND", outer: "black", inner: null },
      // { type: "OR", outer: "black", inner: "white" },
      { type: "Q-gate", outer: "black", inner: "red" },
      { type: "Conditional", outer: "black", inner: "grey" }
    ];

    const legendItem = legend.selectAll("g")
      .data(legendData)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    // outer circle
    legendItem.append("circle")
      .attr("r", 7)
      .style("fill", d => d.outer);

    // inner circle if needed
    legendItem.filter(d => d.inner)
      .append("circle")
      .attr("r", 6)
      .style("fill", d => d.inner);

    // labels
    legendItem.append("text")
      .attr("x", 15)
      .attr("y", 5)
      .text(d => d.type)
      .style("font-size", "12px")
      .style("alignment-baseline", "middle");
  }

  //--------------------------------------------------------------------------------------------------------------------------------------------
  //update function
  update(source) {

    const rectHeight = 40, rectWidth = 150;


    // Assign positions
    const treeData = this.treemap(this.root);
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    //nodes.forEach(d => d.y = d.depth * 180);

    const maxDepth = d3.max(nodes, d => d.depth);
    const usableWidth = this.width - rectWidth - 20;

    nodes.forEach(d => {
      d.y = maxDepth === 0
        ? 0
        : (d.depth / maxDepth) * usableWidth;
    });

    // ----- Nodes ------------------------------------------------------------------
    const node = this.svg.selectAll('g.node')
      .data(nodes, d => d.id || (d.id = ++this.i));

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr("transform", d => `translate(${source.y0},${source.x0})`)
      .attr("data-refcode", d => d.data.refCode)
      .on('dblclick', (event, d) => this.click(d)) //double click to expand

    nodeEnter.append('rect')
      .attr("width", rectWidth)
      .attr("height", rectHeight)
      .attr("x", 0)
      .attr("y", -rectHeight / 2)
      .attr("rx", "5")
      .style("fill", d => { //leafs get dark grey colour
        // Leaf if no visible or hidden children
        if (this.isControl(d.data.refCode)) {
          return "darkorchid"
        }
        if (!d.children && !d._children) {
          return "#2e2d2d";  // light grey
        }
        return "#595757";
      })

    nodeEnter.append('rect')
      .attr("class", "inner-rect-green")
      .attr("width", d => {
        if (!this.elementsData || this.isControl(d.data.refCode)) return 0;
        return (rectWidth - 10);
      })
      //.attr("width", rectWidth - 10)
      .attr("height", rectHeight / 3)
      .attr("x", 5)
      .attr("y", 2)
      .style("fill", "green");

    nodeEnter.append('rect')
      .attr("class", "inner-rect-red")
      .attr("width", d => {
        if (!this.elementsData || this.isControl(d.data.refCode)) return 0;
        let f_val = this.getProbValues(d.data.refCode, false);
        return (rectWidth - 10) * f_val;
      })
      .attr("height", rectHeight / 3)
      .attr("x", 5)
      .attr("y", 2)
      .style("fill", "red");

    nodeEnter.append('text')
      .attr("dy", "-.35em")
      .attr("x", 6)
      .attr("text-anchor", "start")
      .text(d => { //display names within box, trim if needed
        let t = d.data.name
        if (t.length > 24) {
          let trimmed = t.substring(0, 22) + "..."
          return trimmed
        }
        return t
      })

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
      .duration(this.duration)
      .attr("transform", d => `translate(${d.y},${d.x})`);

    node.exit().transition()
      .duration(this.duration)
      .attr("transform", d => `translate(${source.y},${source.x})`)
      .remove()
      .select('text')
      .style('fill-opacity', 1e-6);

    // ----- Junctions -----------------------------------------------------------------------------------
    const junction = this.svg.selectAll('g.junction')
      .data(nodes.filter(d => d.children), d => d.id);

    const junctionEnter = junction.enter().append('g')
      .attr('class', 'junction')
      .attr('transform', d => `translate(${d.y + rectWidth + 7}, ${d.x})`);

    junctionEnter.append('circle')
      .attr('r', 0)
      .style('fill', 'black'); 

    junctionEnter.filter(d => d.data.gateType === "or")
      .append('circle')
      .attr('r', 0)
      .style('fill', 'white');

    junctionEnter.filter(d => d.data.gateType === "and")
      .append('circle')
      .attr('r', 0)
      .style('fill', 'black');

    junctionEnter.filter(d => d.data.gateType === "QJunction")
      .append('circle')
      .attr('r', 0)
      .style('fill', 'red');

    junctionEnter.filter(d => d.data.gateType === "bayesian")
      .append('circle')
      .attr('r', 0)
      .style('fill', 'grey');

    let gTypes = ["and", "or", "QJunction", "bayesian"]


    junctionEnter.filter(d => !gTypes.includes(d.data.gateType) ) //flag gate errors if i forgot
      .append('circle')
      .attr('r', 0)
      .style('fill', 'pink');

    const junctionUpdate = junctionEnter.merge(junction);

    junctionUpdate.selectAll('circle')
      .transition().duration(this.duration)
      .attr('r', (d, i) => {
        if (gTypes.includes(d.data.gateType)) {
          return i === 0 ? 7 : 6
        } else { return 0} //if no gateType identified, then no circle junction
        });
   

    junctionUpdate.transition()
      .duration(this.duration)
      .attr('transform', d => `translate(${d.y + rectWidth + 7}, ${d.x})`);

    junction.exit().transition()
      .duration(this.duration / 4)
      .style('opacity', 0)
      .remove();

    // ---------- Links ------------------------------------------------------------
    const link = this.svg.selectAll("path.link")
      .data(links, d => d.id);

    const linkEnter = link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", d => {
        const o = { x: source.x0, y: source.y0 };
        return this.diagonal(o, o, rectWidth);
      });

    const linkUpdate = linkEnter.merge(link);

    linkUpdate.transition()
      .duration(this.duration)
      .attr("d", d => this.diagonal(d, d.parent, rectWidth));

    link.exit().transition()
      .duration(this.duration)
      .attr("d", d => {
        const o = { x: source.x, y: source.y };
        return this.diagonal(o, o, rectWidth);
      })
      .remove();

    // Save old positions
    nodes.forEach(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });


    //-----------------Tooltip on the nodes--------------------------

    this.svg.selectAll('rect')
      // Tooltip events
      .on("mouseover", (event, d) => {
        let nodeID = d.data.refCode

        this.tooltip
          .style("opacity", 1)
          // .html(this.getProbValues(nodeID, true))
          .html(`<span style='font-size: 13px;'><u>${d.data.name}</u>:</span><br>
            Success: <span style='color:MediumSeaGreen'>${this.getProbValues(nodeID, true).toFixed(3)}</span>
           Fail: <span style='color:Tomato'>${this.getProbValues(nodeID, false).toFixed(3)}</span>`)
      })
      .on("mousemove", (event) => {
        this.tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`);
      })
      .on("mouseout", () => {
        this.tooltip
          .style("opacity", 0);
      })


    //----------------------click events------------------------

    //dispatches event when node is clicked
    this.svg.selectAll('rect')
      .on("click", (event, d) => { //clicking the node to highlight

        // if it's a leaf node → ignore clicks for highlighting
        if (!d.children && !d._children) return;

        //get current node and stroke status
        const rect = d3.select(event.currentTarget);
        const currentStroke = rect.style("stroke");
        let clickEvent;

        // Toggle highlight
        if (currentStroke === "orange") { //node is highlighted -> remove highlight
          rect.style("stroke", "none");
          clickEvent = new CustomEvent("treeChangeNode", { detail: this.root.data.refCode });
        } else { //node is not highlighted -> exit old node and highlight current one
          d3.selectAll("rect").style("stroke", "none");
          rect.style("stroke", "orange");
          clickEvent = new CustomEvent("treeChangeNode", { detail: d.data.refCode });
        }


        window.dispatchEvent(clickEvent);
      })

  }


  //--------------------------- helpers -------------------------------------
  diagonal(s, d, rectWidth) {
    let startY = s.y, startX = s.x;
    let endY = d.y + rectWidth, endX = d.x;
    let midY = (startY + endY) / 2;

    return `M ${startY} ${startX}
            C ${midY} ${startX},
              ${midY} ${endX},
              ${endY} ${endX}`;
  }

  click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    this.update(d);
  }

  //gets values from the pTable
  getProbValues(id, success) {
    let element = this.elementsData.find(e => e.refCode == id);
    return success ? element.probability.success : element.probability.fail;
  }

  //bool if element is a control
  isControl(id) {
    let element = this.elementsData.find(e => e.refCode == id);
    return (element.stereotype === "Control") ? true : false;
  }
}