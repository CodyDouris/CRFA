//Function to render the first map that is displayed AFTER the json maps have been loaded
function renderStartMap(geoParameters) {
    if (Object.keys(topojsonObjects).length === geoParameters.length * 2) {
        adjustQuintiles("province/territory")
        renderMap(d3.select("#Geography").property("value"));
        
        //Set all dropdowns to have a relative width
        d3.selectAll("select")
            .style("width", function() {
                if(this.options[this.options.selectedIndex] == undefined)
                    return;
                return (this.options[this.options.selectedIndex].innerHTML !== undefined ? (((this.options[this.options.selectedIndex].innerHTML.length + 3.8) * 9.2) + "px") : "auto");
            });

        //Renders Canada data on initial loading
        renderSelectedArea({ "data": d3.select("#canadaCircle").property("__data__") }, cleanedData["$province/territory"]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")]
            [0], "province/territory");
    }
}

//Function renders area that is moused over in the svg
function renderSelectedArea(areaDisplay, areaAverage, geographyChange) {
    let significanceFlag;
    let significantASRCrudeToggle = (asrCrudeToggle === "ASR" ? "ASR" : "Cr");
    
    //if canada data is equal to the data being sent through
    if (areaDisplay.data === areaAverage) {
        d3.select("#selectedMapDisplay").remove();
        d3.select("#description").html(
            "The <span class='clientLabel'>" +
            d3.select("#Indicator").property("value").toLowerCase() +
            "</span> "+(asrCrudeToggle === "ASR" ? "age-standardized" : "crude")+" rate for <span class='clientLabel'>" +
            //For proper wording of paragraph
            (d3.select("#AgeGroups").property("value").split(" ")[0] === "adults" && d3.select("#Sex").property("value") !== "both sexes" 
            ? "adult" : d3.select("#AgeGroups").property("value").split(" ")[0]) +
            " "+
            "</span> <span class='clientLabel'> " +
            (d3.select("#Sex").property("value") === "both sexes" ? " of " : "") +
            d3.select("#Sex").property("value") +
            "</span>  in <span class='clientLabel areaName'>" +
            capitalize(areaDisplay.data.Geo_Label) +
            "</span>  is <span class='clientLabel'>" +
            Number(areaDisplay.data[asrCrudeToggle]).toFixed(1) +
            "%</span>."
        );
        renderGraph(areaDisplay, geographyChange);
    }
    else {
        if (areaDisplay.data && areaDisplay.data[asrCrudeToggle] !== '') {
            if (Number(areaDisplay.data["Lower_CI_" + significantASRCrudeToggle]) <= Number(areaAverage["Upper_CI_" + significantASRCrudeToggle]) && 
           Number(areaDisplay.data["Upper_CI_" + significantASRCrudeToggle]) >= Number(areaAverage["Lower_CI_" + significantASRCrudeToggle]))
                significanceFlag = "not significantly different from the ";
            else if (Number(areaDisplay.data[asrCrudeToggle]) < Number(areaAverage[asrCrudeToggle]))
                significanceFlag = "lower than the";
            else 
                significanceFlag = "higher than the";
                
            //Sets description based on area selected
            d3.select("#description").html(
                "The <span class='clientLabel'>" +
                d3.select("#Indicator").property("value").toLowerCase() +
                "</span> "+(asrCrudeToggle == "ASR" ? "age-standardized rate" : "crude rate")+" for <span class='clientLabel'>" +
                
                (d3.select("#AgeGroups").property("value").split(" ")[0] === "adults" && d3.select("#Sex").property("value") !== "both sexes" 
                ? "adult" : d3.select("#AgeGroups").property("value").split(" ")[0]) +
                " "+
                "</span><span class='clientLabel'>" +
                (d3.select("#Sex").property("value") === "both sexes" ? " of " : "") +
                d3.select("#Sex").property("value") +
                "</span>  in <span class='clientLabel areaName'>" +
                //Extra code to ensure province in includes with health regions and CMAs and formats provinces correctly
                (geographyChange ==  "province/territory" || areaDisplay.data.Geo_Label == areaDisplay.data.Geo_Label.toUpperCase() ? capitalize(areaDisplay.data.Geo_Label):areaDisplay.data.Geo_Label) + 
                (geographyChange !== "province/territory" ? ", " + topojsonObjects["province/territory"].filter(function(item){ return item.properties.PRUID === areaDisplay.properties.PRUID.split("/")[0] })[0].properties.PREABBR : "") +
                (areaDisplay.properties.PRUID.split("/")[1] !== undefined ? 
                " / " + topojsonObjects["province/territory"].filter(function(item){ return item.properties.PRUID === areaDisplay.properties.PRUID.split("/")[1] })[0].properties.PREABBR : "") + //add the break in middle for ottawa/gatineau
                "</span> is <span class='clientLabel'>" +
                Number(areaDisplay.data[asrCrudeToggle]).toFixed(1) +
                "%</span>. This is <span class='clientLabel'>" +
                significanceFlag +
                "</span> national average of <span class='clientLabel'>" +
                Number(areaAverage[asrCrudeToggle]).toFixed(1) +
                "%</span>.");
        }
        else
            d3.select("#description").html("There is insufficient data for this area.");
        //Transitions for selected area svg
        if (d3.select("#selectedMapDisplay")._groups[0][0]) {
            if (areaDisplay === d3.select("#province").property("__data__"))
                d3.select("#province")
                .transition()
                .duration(1000)
                .style("fill", function(d) {
                    return returnColor(d);
                });
            else {
                d3.select("#province")
                    .transition()
                    .duration(100)
                    .style("opacity", 0)
                    .on("end", function() {
                        d3.select("#province")
                            .remove();

                        d3.select("#selectedAreaG")
                            .selectAll(".selectedArea")
                            .data([areaDisplay])
                            .enter()
                            .append("path");
                        
                        d3.select("#selectedAreaG path")
                            .attr("id", "province")
                            .attr("aria-label","Map of "+(areaDisplay.data ? areaDisplay.data.Geo_Label : "insufficient data area" ))
                            .attr("d", path)
                            .style("stroke", "#333333")
                            .style("opacity", 0)
                            .style("fill", function(d) {
                                return returnColor(d);
                            });

                        $("#province").ready(provinceReady);

                        d3.select("#province")
                            .transition()
                            .duration(100)
                            .style("opacity", 1);
                    });
            }
        }
        else {
            d3.select("#selectedMap")
                .append("svg")
                .attr("id", "selectedMapDisplay")
                .attr("height", "150px")
                .attr("width", "100%")
                .attr("viewBox", "40 0 225 280")
                .append("g")
                .attr("id", "selectedAreaG");

            d3.select("#selectedAreaG")
                .selectAll(".selectedArea")
                .data([areaDisplay])
                .enter()
                .append("path")
                .attr("id", "province")
                .attr("aria-label","Map of "+(areaDisplay.data ? areaDisplay.data.Geo_Label : "insufficient data area" ))
                .attr("d", path)
                .style("stroke", "#333333")
                .style("fill", function(d) {
                    return returnColor(d);
                });
        }

        $("#province").ready(provinceReady);
        //Function called after area has been fulled loaded
        function provinceReady() {
            let scale = "";
            const svgContainer = d3.select("#selectedMap svg path");

            if (svgContainer.node()) {
                const BBox = svgContainer.node().getBBox();
                const BBoxHeight = BBox.height;
                const BBoxWidth = BBox.width;

                if (BBoxHeight >= BBoxWidth)
                    scale = 2000000 / BBoxHeight;
                else if (BBoxWidth > BBoxHeight)
                    scale = 2000000 / BBoxWidth;
                else
                    scale = 1;

                const newMatrix = buildNewMatrix(scale, BBoxWidth, BBoxHeight);

                $("#selectedMap svg path").attr("d", newMatrix);

                svgContainer.attr("stroke-width", 1 / scale).attr("stroke", "#333");

                $("#selectedAreaG path").attr("stroke-width", 1 / (0.0001 * scale));
                $("#selectedAreaG").attr("transform", "scale(" + 0.0001 * scale + ")");
            }
        }
        renderGraph(areaDisplay, geographyChange);
    }
}

//Function that creates new matrix of the selected area
function buildNewMatrix(s) {
    const scale = s;

    let currentD = $("#selectedMap svg path").attr("d");
    const spaceParsed = currentD[1] === " ";
    currentD = currentD.replace(/M/g, "");

    const matrixArray = currentD.split("Z");
    matrixArray.pop();
    let newMatrixArray = [];

    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;

    let first = true;

    for (let matrix in matrixArray) {
        let coordinates = matrixArray[matrix].split("L");
        for (let coordinate in coordinates) {
            let currentCoordinates = coordinates[coordinate];
            if (spaceParsed) {
                currentCoordinates = currentCoordinates.trim();
                currentCoordinates = currentCoordinates.replace(" ", ",");
            }
            let cArr = currentCoordinates.split(",");
            let x = parseFloat(cArr[0]);
            let y = parseFloat(cArr[1]);
            if (first) {
                minX = x;
                minY = y;
                maxX = x;
                maxY = y;
                first = false;
            }
            else {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }

    const width = maxX - minX;
    const height = maxY - minY;

    const xDiff = (1400000 - width * scale * 0.5) / scale;
    const yDiff = (1400000 - height * scale * 0.5) / scale;

    for (let matrix in matrixArray) {
        const coordinates = matrixArray[matrix].split("L");
        let newCoordinates = [];
        for (let coordinate in coordinates) {
            let currentCoordinates = coordinates[coordinate];
            if (spaceParsed) {
                currentCoordinates = currentCoordinates.trim();
                currentCoordinates = currentCoordinates.replace(" ", ",");
            }
            let cArr = currentCoordinates.split(",");
            let x = parseFloat(cArr[0]) - minX + xDiff;
            let y = parseFloat(cArr[1]) - minY + yDiff;
            if (spaceParsed) newCoordinates.push(x + " " + y);
            else newCoordinates.push(x + "," + y);
        }
        if (spaceParsed)
            newMatrixArray.push("M " + newCoordinates.join(" L ") + " Z");
        else newMatrixArray.push("M" + newCoordinates.join("L") + "Z");
    }
    if (spaceParsed) return newMatrixArray.join(" ");
    else return newMatrixArray.join("");
}

//Function renders the map that is selected in geography dropdown
function renderMap(geographyChange) {
    areaClicked = false;
    let centered;
    let currentArea = topojsonObjects[geographyChange].slice();

    //Assigning the specific cleanedData to the area objects
    currentArea.forEach(function(item) {
        item.data = cleanedData["$" + geographyChange]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")]
            .map(function(area) {
                switch (Number(area.GEO_Code)) {
                    case Number(item.properties.PRUID):
                        return area;
                    case Number(item.properties.HR_UID):
                        return area;
                    case Number(item.properties.CMA):
                        return area;
                    case 0:
                        canadaObject = area;
                }
            })
            .filter(Boolean)[0];
    });
    //Map transition when geography changes
    if (d3.select("#mapG")._groups[0][0]) {
        d3.select("#mapG")
            .transition()
            .duration(1000)
            .style("opacity", 0)
            .on("end", function() {
                d3.select("#map").remove();
                createMap();
            });
        let tempG = d3.select("#map")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("background", "#cfcf9f")
            .attr("id", "tempMapG")
            .style("opacity", 0);

        if (geographyChange === "census metropolitan areas/large census agglomerations") {
            tempG
                .selectAll(".background")
                .data(topojsonObjects["province/territory"])
                .enter()
                .append("path")
                .attr("d", path)
                .style("fill", "white")
                .style("stroke", "#333333");
        }
        tempG
            .selectAll(".area")
            .data(currentArea)
            .enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "#333333")
            .style("fill", function(d) {
                return returnColor(d);
            });

        if (ecumeneToggle) {
            tempG.selectAll("path")
                .style("fill", "white");

            tempG
                .selectAll(".ecumene")
                .data(topojsonObjects[geographyChange + "Ecumene"])
                .enter()
                .append("path")
                .attr("d", path)
                .style("stroke", "#333333")
                .style("fill", function(d) {
                    currentArea.forEach(function(area) {
                        if (area.properties.PRUID === d.properties.PRUID && area.properties.PRUID !== undefined && (area.properties.HR_UID == undefined && area.properties.CMA == undefined))
                            d.data = area.data;
                        else if (area.properties.HR_UID === d.properties.HR_UID && area.properties.HR_UID !== undefined)
                            d.data = area.data;
                        else if (area.properties.CMA === d.properties.CMA && area.properties.CMA !== undefined)
                            d.data = area.data;
                    });
                    return returnColor(d);
                });
        }

        d3.select("#tempMapG")
            .transition()
            .duration(1000)
            .style("opacity", 1);
    }
    else
        createMap();
        
    //Function that creates map after previous map has been removed
    function createMap() {
        const mapSVG = d3
            .select("#mapContainer")
            .append("svg")
            .lower()
            .attr("id", "map")
            .attr("height", "630px")
            .attr("width", "100%")
            .attr("viewBox", "0 0 595 580")
            .attr("aria-label","Map of Canada by "+ geographyChange)
            .on("click", function() {
                if (areaClicked && (!d3.event.target.__data__ || !d3.event.target.attributes.type)) {
                    areaClicked = false;

                    d3.selectAll("#map path")
                        .style("stroke", "#333333")
                        .attr("class", "");

                    d3.select("#canadaCircle")
                        .style("stroke", "#333333")
                        .attr("class", "");

                    d3.selectAll("#mapG circle")
                        .style("stroke", "red")
                        .attr("class", "");
                }
                else if (d3.event.target.__data__ && d3.event.target.attributes.type) {
                    if (!d3.event.target.__data__.data)
                        return;
                    areaClicked = true;

                    d3.selectAll("#map path")
                        .style("stroke", "#333333")
                        .attr("class", "");

                    d3.select("#canadaCircle")
                        .style("stroke", "#333333")
                        .attr("class", "");
                    

                    d3.selectAll("#map path").attr("class", "selectedArea");
                    
                    d3.selectAll("#mapG circle").attr("class", "selectedArea");

                    if (ecumeneToggle) {
                        let temp = d3.selectAll("path[type=ecumene]")
                            .filter(function(d) {
                                return ((d.properties.PRUID === d3.event.target.__data__.properties.PRUID && d3.event.target.__data__.properties.PRUID !==
                                        undefined && geographyChange === "province/territoryEcumene") ||
                                    (d.properties.HR_UID === d3.event.target.__data__.properties.HR_UID && d3.event.target.__data__.properties.HR_UID !==
                                        undefined) ||
                                    (d.properties.CMA == d3.event.target.__data__.properties.CMA && d3.event.target.__data__.properties.CMA !==
                                        undefined));
                            })
                            .style("stroke", "red")
                            .attr("class", "");

                    }
                    d3.select(d3.event.target)
                        .style("stroke", "red")
                        .attr("class", "");
                    renderSelectedArea((d3.event.target.__data__.data ? d3.event.target.__data__ : { "data": d3.event.target.__data__ }), canadaObject, geographyChange);
                }
            })
            .append("g")
            .attr("id", "mapG")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("background", "#cfcf9f");

        //Drawing the legend
        //Creation of the legend for the map
        let legend = d3.select("#map")
            .append("g")
            .attr('id', 'legend')
            .attr("transform", "translate(" + (margin.left + 370) + "," + (margin.top + 0) + ")");

        legend
            .append("text")
            .attr("id", "legendTitle")
            .style("font-weight", "bold")
            .attr("x", function(d){
            if(d3.select("#Indicator").property("value").length > 10)
                return (d3.select("#Indicator").property("value").length * - 6.5)
                
                return -35;
        })
            .attr("y", 0)
            .text(d3.select("#Indicator").property("value") + " prevalence (%)");

        quintileArray.forEach(function(item, index) {
            legend
                .append("rect")
                .attr("x", 45)
                .attr("y", (index * 26) + 10)
                .attr("width", item.width)
                .attr("height", 15)
                .attr("lowerbound", item.lowerbound)
                .attr("upperbound", item.upperbound)
                .attr("class","legendRect")
                .attr("id","quintile" + index)
                .style("stroke", "black")
                .style("fill", item.colour)
                .on("mouseover", function() {
                    if (item.lowerbound !== "none") {
                        areaClicked = false;
                        let currentColor = d3.select(this).property("attributes");
                        d3.selectAll("#map path").attr("class", "selectedArea");
                        d3.selectAll("circle[type=circle-icon]").attr("class", "selectedArea");
                        d3.selectAll("path[type=area]")
                            .filter(function(d) {
                                return (
                                    Number(currentColor.lowerbound.value) <
                                    (d.data === undefined ? 0 : Number(d.data[asrCrudeToggle])) &&
                                    (d.data === undefined ? 0 : Number(d.data[asrCrudeToggle])) <
                                    Number(currentColor.upperbound.value)
                                );
                            })
                            .attr("class", " ");
                        d3.selectAll("circle[type=circle-icon]")
                            .filter(function(d) {
                                return (
                                    Number(currentColor.lowerbound.value) <
                                    (d.data === undefined ? 0 : Number(d.data[asrCrudeToggle])) &&
                                    (d.data === undefined ? 0 : Number(d.data[asrCrudeToggle])) <
                                    Number(currentColor.upperbound.value)
                                );
                            })
                            .attr("class", " ");
                    }
                })
                .on("mouseout", function() {
                    d3.selectAll("#map path")
                        .attr("class", "")
                        .style("stroke", "black");
                    d3.selectAll("circle[type=circle-icon]").attr("class", "");
                });

            legend
                .append("text")
                .attr("x", 38)
                .attr("y", (index * 26) + 23)
                .attr("class","legendText")
                .style("text-anchor","end")
                .style("font-weight", "bold")
                .style("font-size", "12px")
                .text(function() {
                    if (item.lowerbound === 0)
                        return item.upperbound.toFixed(1) + " or less";
                    else if (item.upperbound === 100)
                        return item.lowerbound.toFixed(1) + " or more";
                    else if (item.upperbound === "none")
                        return "Insufficient data";
                    else
                        return item.lowerbound.toFixed(1) + " to " + item.upperbound.toFixed(1);
                });
        });
        //Creation of the circle to display the canadian average on the right of the map
        let canadaCircle = d3.select("#map")//450 //200
            .append("g")
            .attr("id", "circleContainer")
            .attr("transform", "translate(" + (margin.left + 90) + "," + (margin.top + 30) + ")");

        canadaCircle
            .selectAll(".canadaCircle")
            .data([canadaObject])
            .enter()
            .append("circle")
            .attr('id', 'canadaCircle')
            .attr("r", 30)
            .style("stroke", "black")
            .style("fill", function(d) { return returnColor({ "data": d }); })
            .on("mouseover", function(d) {
                if (!areaClicked) {
                    d3.selectAll("#map path").attr("class", "selectedArea");
                    d3.selectAll("circle[type=circle-icon]").attr("class", "selectedArea");
                    d3.select(this).attr("class", "");

                    renderSelectedArea({ "data": d }, canadaObject, geographyChange);
                }
            })
            .on("mouseout", function() {
                if (!areaClicked) {
                    d3.selectAll("#map path").attr("class", "");
                    d3.selectAll("circle[type=circle-icon]").attr("class", "");
                }
            });

        canadaCircle
            .append("text")
            .attr("dx", -120)
            .attr("dy", 5)
            .style("font-size","22px")
            .style("fill", "black")
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .text("Canada");
            
        // canadaCircle
        //     .append("text")
        //     .attr("id","allTag")
        //     .attr("dx", -15)
        //     .attr("dy", 20)
        //     .style("fill", "black")
        //     .style("font-weight", "bold")
        //     .style("pointer-events", "none")
        //     .text("(all)");

        //Background provinces for the CMAS
        if (geographyChange === "census metropolitan areas/large census agglomerations") {
            mapSVG
                .selectAll(".background")
                .data(topojsonObjects["province/territory"])
                .enter()
                .append("path")
                .attr("d", path)
                .style("fill", "white")
                .style("stroke", "#333333");

            d3.select("#CMANotes").html("<li>This data includes all <a href='https://www12.statcan.gc.ca/census-recensement/2016/ref/dict/geo009-eng.cfm'>Census Metropolitan Areas (CMAs), Census Agglomerations (CAs)</a> and the territorial capitals (i.e. Yellowknife (CA), Nunavut (CA) and the city of Iqaluit (<u data-toggle='tooltip' title='Census Subdivision'>*</u>)).  Large CAs refers to those for which sufficient data is available to provide reliable estimates.</li>");

            legend
                .append("circle")
                .attr("cx", 55)
                .attr("cy", 175)
                .attr("r", "7")
                .style("fill", "red")
                .style("cursor", "pointer")
                .on("click", function() {
                    if (d3.select("circle[type=circle-icon]").property("style").display === "none")
                        d3.selectAll("circle[type=circle-icon]").style("display", "inline");
                    else
                        d3.selectAll("circle[type=circle-icon]").style("display", "none");
                });
                
            legend
                .append("text")
                .attr("x", -35)
                .attr("y", 181)
                .style("font-weight", "bold")
                .style("font-size", "12px")
                .text("Major Cities");
        }
        else
            d3.select("#CMANotes").html("");
            
        //Creation of map with data behind it
        mapSVG
            .selectAll(".area")
            .data(currentArea)
            .enter()
            .append("path")
            .attr("tabindex", 0)
            .attr("d", path)
            .attr("aria-label",function(d){ return d.properties.PRNAME })
            .style("fill", function(d) {
                return returnColor(d);
            })
            .style("stroke", "#333333")
            .attr("type", "area")
            .on("click", zoom)
            .on("keydown", function(d) { if(d3.event.keyCode == 13) zoom(d)})
            .on("mouseover", function(d) {
                if (!areaClicked) {
                    d3.selectAll("#map path").attr("class", "selectedArea");
                    d3.selectAll("circle[type=circle-icon]").attr("class", "selectedArea");
                    if (ecumeneToggle) {
                        d3.selectAll("path[type=ecumene]")
                            .filter(function(area) {
                                return ((d.properties.PRUID === area.properties.PRUID && area.properties.PRUID !==
                                        undefined && geographyChange === "province/territoryEcumene") ||
                                    (d.properties.HR_UID === area.properties.HR_UID && area.properties.HR_UID !==
                                        undefined) ||
                                    (d.properties.CMA == area.properties.CMA && area.properties.CMA !==
                                        undefined));
                            })
                            .attr("class", "");
                    }
                    d3.select(this).attr("class", "");
                    renderSelectedArea(d, canadaObject, geographyChange);
                }
            })
            .on("focus", function(d) {
                if (!areaClicked) {
                    d3.selectAll("#map path").attr("class", "selectedArea");
                    d3.select(this)
                        .style("outline", "none")
                        .attr("class", "");
                    renderSelectedArea(d, canadaObject, geographyChange);
                }
            })
            .on("blur", function() {
                if (!areaClicked)
                    d3.selectAll("#map path").attr("class", "");
            })
            .on("mouseout", function() {
                if (!areaClicked) {
                    d3.selectAll("#map path").attr("class", "");
                    d3.selectAll("circle[type=circle-icon]").attr("class", "");
                }
            });

        //This is the click on zoom function
        function zoom(d) {
            let x, y, k;

            if (d && centered !== d) {
                let centroid = path.centroid(d);
                x = centroid[0] + 30;
                y = centroid[1];
                k = 2;
                centered = d;
                
                if(d3.select("#legendBackground")._groups[0][0] == undefined)    
                    d3.select("#legend")
                        .append("rect")
                        .attr("id","legendBackground")
                        .attr("width", "38%")
                        .attr("height", "28%")
                        .attr("y","5")
                        .attr("x","-66")
                        .style("fill", "#FFFFFF")
                        .style("stroke","black")
                        .style("opacity", 0)
                        .lower()
                        .transition()
                        .style("opacity", 0.8)
                        .duration(700);
            }
            else {
                x = 690 / 2;
                y = 630 / 2 - 50;
                k = 1;
                centered = null;
                
                d3.select("#legendBackground")
                    .transition()
                    .style("opacity", 0)
                    .duration(700)
                    .remove();
            }

            mapSVG
                .selectAll("path")
                .classed("active", centered && function(d) { return d === centered; });

            mapSVG
                .transition()
                .duration(750)
                .attr("transform", "translate(" + 790 / 2 + "," + 630 / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")");
        }

        //Ecumene Background if requested
        if (ecumeneToggle) {
            d3.selectAll("path[type=area]")
                .style("fill", "white");

            mapSVG
                .selectAll(".ecumene")
                .data(topojsonObjects[geographyChange + "Ecumene"])
                .enter()
                .append("path")
                .attr("d", path)
                .style("fill", function(d) {
                    currentArea.forEach(function(area) {
                       if (area.properties.PRUID === d.properties.PRUID && area.properties.PRUID !== undefined && (area.properties.HR_UID == undefined && area.properties.CMA == undefined))
                        d.data = area.data;
                        else if (area.properties.HR_UID === d.properties.HR_UID && area.properties.HR_UID !== undefined)
                            d.data = area.data;
                        else if (area.properties.CMA === d.properties.CMA && area.properties.CMA !== undefined)
                            d.data = area.data;
                    
                    });
                    return returnColor(d);
                })
                .style("stroke", "#333333")
                .attr("type", "ecumene")
                .style("pointer-events", "none");

            geographyChange = geographyChange + "Ecumene";
        }

        // Draw circle marker and assign labels to all cpaitals and major cities
        if (geographyChange === "census metropolitan areas/large census agglomerations") {
            let cmaArray = ["Whitehorse (CA)", "Yellowknife (CA)", "Iqaluit (*)", "St Johns (CMA)", "Charlottetown (CA)", "Halifax (CMA)", "Fredericton (CA)", "Québec (CMA)", "Ottawa - Gatineau (CMA)", "Montréal (CMA)", "Toronto (CMA)", "Winnipeg (CMA)", "Calgary (CMA)", "Regina (CMA)", "Edmonton (CMA)", "Victoria (CMA)"];
            mapSVG.selectAll('.circle-icon')
                .data(topojsonObjects["census metropolitan areas/large census agglomerations"])
                .enter()
                .append('circle')
                .on("click", zoom)
                .on("keydown", function(d) { if(d3.event.keyCode == 13) zoom(d)})
                .each(function(d) {
                    if (!cmaArray.includes(d.data.Geo_Label)) {
                        return;
                    }
                    d3.select(this)
                        .attr("r", 3)
                        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
                        .style("fill", "red")
                        .attr('type', 'circle-icon')
                        .on("mouseover", function(d) {
                            if (!areaClicked) {
                                d3.selectAll("#map path").attr("class", "selectedArea");
                                d3.selectAll("circle[type=circle-icon]").attr("class", "selectedArea");
                                if (ecumeneToggle) {
                                    d3.selectAll("path[type=ecumene]")
                                        .filter(function(area) {
                                            return ((d.properties.PRUID === area.properties.PRUID && area.properties.PRUID !==
                                                    undefined && geographyChange === "province/territoryEcumene") ||
                                                (d.properties.HR_UID === area.properties.HR_UID && area.properties.HR_UID !==
                                                    undefined) ||
                                                (d.properties.CMA == area.properties.CMA && area.properties.CMA !==
                                                    undefined));
                                        })
                                        .attr("class", "");
                                }
                                d3.select(this).attr("class", "");
                                renderSelectedArea(d, canadaObject, geographyChange);
                            }
                        })
                        .on("mouseout", function(d) {
                            if (!areaClicked) {
                                d3.selectAll("#map path").attr("class", "");
                                d3.selectAll("circle[type=circle-icon]").attr("class", "");
                            }
                        });
                })
                .filter(function(d) {
                    return !cmaArray.includes(d.data.Geo_Label);
                }).remove();
        }
        //Sending info to the parameterschange
        currentArea.unshift({
            data: canadaObject
        });
        
        currentArea[0].data.Geography = geographyChange;
        parametersSelectedChange(currentArea[0], currentArea);
    }
}
//Function to dynamically change the map based on parameters that are not geography
function updateMap(geographyChange) {
    
    switch (geographyChange) {
        case "ProvincesTerritories":
            geographyChange = "province/territory";
            break;
        case "HealthRegions":
            geographyChange = "health regions";
            break;
        case "CensusMetropolitanAreas":
            geographyChange = "census metropolitan areas/large census agglomerations";
    }
    
    //Update legend with new quintiles each change
    d3.selectAll(".legendText").each(function(item,index){
        if (quintileArray[index].lowerbound === 0)
            this.textContent = parseFloat(quintileArray[index].upperbound).toFixed(1) + " or less";
        else if (quintileArray[index].upperbound === 100)
            this.textContent = parseFloat(quintileArray[index].lowerbound).toFixed(1) + " or more";
        else if (quintileArray[index].upperbound === "none")
            this.textContent = "Insufficient data";
        else
            this.textContent = parseFloat(quintileArray[index].lowerbound).toFixed(1) + " to " + parseFloat(quintileArray[index].upperbound).toFixed(1);
    });
    
    d3.selectAll(".legendRect").each(function(item,index){
       this.attributes.upperbound.value = quintileArray[index].upperbound;
       this.attributes.lowerbound.value = quintileArray[index].lowerbound;
    });

    
    let circleContainer = d3.select("#circleContainer");

    let currentArea = [];
    d3.selectAll("path[type=area]")._groups[0].forEach(function(item) {
        item.__data__.data = cleanedData["$" + geographyChange]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")]
            .map(function(area) {
                switch (Number(area.GEO_Code)) {
                    case Number(item.__data__.properties.PRUID):
                        return area;
                    case Number(item.__data__.properties.HR_UID):
                        return area;
                    case Number(item.__data__.properties.CMA):
                        return area;
                    case 0:
                        canadaObject = area;
                }
            })
            .filter(Boolean)[0];
        currentArea.push(item.__data__);
    });

    circleContainer
        .data([canadaObject])
        .exit()
        .remove();

    circleContainer
        .enter()
        .append("circle")
        .attr('id', 'canadaCircle')
        .attr("r", 30)
        .style("stroke", "black");

    circleContainer
        .select("circle")
        .transition()
        .duration(1000)
        .style("fill", function(d) { return returnColor({ "data": d }) });
    
    if (ecumeneToggle) {
        d3.selectAll("path[type=ecumene]")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                currentArea.forEach(function(area) {
                    if (area.properties.PRUID === d.properties.PRUID && area.properties.PRUID !== undefined && (area.properties.HR_UID == undefined && area.properties.CMA == undefined))
                        d.data = area.data;
                    else if (area.properties.HR_UID === d.properties.HR_UID && area.properties.HR_UID !== undefined)
                        d.data = area.data;
                    else if (area.properties.CMA === d.properties.CMA && area.properties.CMA !== undefined)
                        d.data = area.data;
                });
                return returnColor(d);
            })
            .style("stroke", "#333333")
            .style("pointer-events", "none");
    }
    else {
        d3.selectAll("path[type=area]")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                return returnColor(d);
            });
    }

    let allAreasArray = Array.from(d3.selectAll("path[type=area]")._groups[0]);
    allAreasArray.unshift({
        __data__: {
            data: canadaObject
        }
    });
    parametersSelectedChange(
        d3.select("path[type=area]").property("__data__"),
        allAreasArray);
}