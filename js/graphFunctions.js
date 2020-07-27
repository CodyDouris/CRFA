//Function to render current graph based on area selected
function renderGraph(dataArea, geography) {
    d3.select("#infoDiv").style("opacity", 1);
    let significantASRCrudeToggle = (asrCrudeToggle === "ASR" ? "ASR" : "Cr");
    //Filling graph parameters according to change
    if (dataArea.data)
        d3.select("#graphParameters").html(
            "Prevalence of <span class='clientLabel'>" +
            dataArea.data.Indicator.toLowerCase() +
            "</span> in <span id='graphParamAge'class='clientLabel'>" +
            //Format paragraph correctly
            (d3.select("#AgeGroups").property("value").split(" ")[0] === "adults" && d3.select("#Sex").property("value") !== "both sexes" 
            ? "adult" : d3.select("#AgeGroups").property("value").split(" ")[0]) +
            " "+
            (d3.select("#Sex").property("value") === "both sexes" ? " of " : "") +
            d3.select("#Sex").property("value") +
            "</span> located in <br/> <span class='clientLabel areaName'>" +
            //For health
            (geography ==  "province/territory" || dataArea.data.Geo_Label == dataArea.data.Geo_Label.toUpperCase() ? capitalize(dataArea.data.Geo_Label):dataArea.data.Geo_Label) +
            "</span> by ");
            
    //reset graph notes
    d3.select("#graphNotes").style("display","inline");
    d3.select("#dottedLineNotes").style("display","list-item");
    d3.select("#suppressedNotes").style("display","none");
    
    //Changing footnotes for graph depending on what is selected in the dropdown
    if(graphFootnotes["$" + d3.select("#SDOH").property("value")])
        d3.select("#graphNotes").html("<li>"+graphFootnotes["$" + d3.select("#SDOH").property("value")][0].SDH_Footnotes+"</li>");
    else
        d3.select("#graphNotes").style("display","none");
        
    //Adding employee notes super script
    if(d3.select("#SDOH").property("value") == "Employment"){
        if(d3.select("#Geography").property("value") == "province/territory"){
            d3.select("#EmploymentSuperScripts")._groups[0][0].innerHTML = 
            '<u><sup class="subscriptFontSize" tabindex="0" data-trigger="focus" data-animation="false" data-container="body" data-toggle="popover" data-html="true" data-content="<strong>Unemployed, long-term illness</strong> refers to those that did not have a paid job and reported having a long-term illness as the main activity last week">1</sup></u> '+
            '<u><sup class="subscriptFontSize" tabindex="0" data-trigger="focus" data-animation="false" data-container="body" data-toggle="popover" data-html="true" data-content="<strong>Unemployed, other causes</strong> refers to those that did not have a paid job last week (excludes those that reported having a long-term illness as the main activity last week)">2</sup></u> '+
            '<u><sup class="subscriptFontSize" tabindex="0" data-trigger="focus" data-animation="false" data-container="body" data-toggle="popover" data-html="true" data-content="<strong>Employed</strong> refers to those who had a paid job or were absent from a paid job last week, including those who had a paid job but were not at work due to own illness or disability">3</sup></u> ';
        }
        else {
            d3.select("#EmploymentSuperScripts")._groups[0][0].innerHTML = 
            '<u><sup class="subscriptFontSize" tabindex="0" data-trigger="focus" data-animation="false" data-container="body" data-toggle="popover" data-html="true" data-content="<strong>Employed</strong> refers to those who had a paid job or were absent from a paid job last week, including those who had a paid job but were not at work due to own illness or disability">3</sup></u> '+
            '<u><sup class="subscriptFontSize" tabindex="0" data-trigger="focus" data-animation="false" data-container="body" data-toggle="popover" data-html="true" data-content="<strong>Unemployed</strong> refers to those who did not have a paid job in the last week">4</sup></u>';
        }
        
        $('[data-toggle="popover"]').popover();
    }
            
    //Try for if data field are not there then will display insufficant data message
    try {
            
        const graphMargin = 50;
        const graphWidth = 500 - 2 * graphMargin;
        const graphHeight = 350 - 2 * graphMargin;
        let dataAbsentCount = 0;

        //Cleaned data of current area selected from graph csv
        let cleanedGraphData = graphData["$" + geography.replace('Ecumene', '')]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")]
            ["$" + d3.select("#SDOH").property("value")]
            .map(function(area) {
                if (Number(dataArea.data.GEO_Code) === Number(area.GEO_Code)) {
                    if (area[asrCrudeToggle] === "" || isNaN(area[asrCrudeToggle]) || area[asrCrudeToggle] === 0) {
                        area[asrCrudeToggle] = 0;
                        area["Lower_CI_" + significantASRCrudeToggle] = 0;
                        dataAbsentCount += 1;
                    }
                    return area;
                }
            })
            .filter(Boolean);
            
            //Quick change so the employed columns will display correctly
            if(d3.select("#SDOH").property("value") == "Employment" && cleanedGraphData[0].SDOH_Cat == "Employed")
                cleanedGraphData.reverse();
            
        const yScale = d3
            .scaleLinear()
            .range([graphHeight, 0])
            .domain([0, 100]);

        const xScale = d3
            .scaleBand()
            .range([0, graphWidth])
            .domain(cleanedGraphData.map(function(d) {
                return d.SDOH_Cat;
            }))
            .padding(0.5);

        const line = d3.line()
            .x(function(d) { return d.lineLength; })
            .y(function(d) { return yScale(d[asrCrudeToggle]); });
            
        canadaObject.lineLength = 0;
        
        if (updateGraphToggle && cleanedGraphData.length > 0 && dataAbsentCount !== cleanedGraphData.length)
            updateGraph();
        else {
            d3.select("#barGraph").remove();
            d3.selectAll(".barSvg text").remove();
            d3.select("#spinner").remove();

            if (cleanedGraphData.length > 0 && dataAbsentCount !== cleanedGraphData.length) {
                updateGraphToggle = true;

                const chart = d3
                    .select(".barSvg")
                    .append("g")
                    .attr("id", "barGraph")
                    .attr("transform", "translate(" + graphMargin + "," + graphMargin + ")");

                chart
                    .append("g")
                    .call(d3.axisLeft(yScale));

                chart
                    .append("g")
                    .attr("transform", "translate(0, " + graphHeight + ")")
                    .attr("id", "xAxis")
                    .call(d3.axisBottom(xScale));

                d3.selectAll("#xAxis text")
                    .style("font-size", "15px")
                    .style("text-anchor", "middle")
                    .style("font-weight", "bold")
                    .call(wrap, 80);

                const barGroups = chart
                    .selectAll()
                    .data(cleanedGraphData)
                    .enter()
                    .append("g")
                    .attr("class", "barG");

                barGroups
                    .append("rect")
                    .attr("width", xScale.bandwidth())
                    .attr("class", "dataBars")
                    .style("fill", "rgb(72, 133, 237)")
                    .attr("x", function(d) {
                        return xScale(d.SDOH_Cat);
                    })
                    .attr("y", function(d) {
                        return yScale(d[asrCrudeToggle]);
                    })
                    .attr("height", function(d) {
                        return graphHeight - yScale(d[asrCrudeToggle]);
                    });

                //Error bars lines are created
                barGroups
                    .append("line")
                    .attr("class", "line-length")
                    .style("stroke", "black")
                    .attr("x1", function(d) {
                        return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                    })
                    .attr("y1", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    })
                    .attr("x2", function(d) {
                        return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                    })
                    .attr("y2", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    });

                //Error bars top lines are created
                barGroups
                    .append("line")
                    .attr("class", "line-top")
                    .style("stroke", "black")
                    .attr("x1", function(d) {
                        return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) - xScale.bandwidth() / 4;
                    })
                    .attr("y1", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    })
                    .attr("x2", function(d) {
                        return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) + xScale.bandwidth() / 4;
                    })
                    .attr("y2", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    });

                //Erro bars bottom lines are created    
                barGroups
                    .append("line")
                    .attr("class", "line-bottom")
                    .style("stroke", "black")
                    .attr("x1", function(d) {
                        return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) - xScale.bandwidth() / 4;
                    })
                    .attr("y1", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    })
                    .attr("x2", function(d) {
                        return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) + xScale.bandwidth() / 4;
                    })
                    .attr("y2", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                    });

                d3.select(".barSvg")
                    .append("text")
                    .attr("x", -(graphHeight / 2) - graphMargin)
                    .attr("y", graphMargin / 2.4)
                    .attr("transform", "rotate(-90)")
                    .style("text-anchor", "middle")
                    .text("Percentage (%)");

                barGroups
                    .append("text")
                    .attr("class", "barText")
                    .style("text-anchor", "middle")
                    .style("font-weight", "bold")
                    .attr("x", function(d) {
                        return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                    })
                    .attr("y", function(d) {
                        return yScale(Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2) - 10;
                    })
                    .text(function(a) {
                        d3.select(this).property("previousValue", a[asrCrudeToggle]);
                        if(a[asrCrudeToggle] == 0)
                            return "No Data";
                        return Number(a[asrCrudeToggle]).toFixed(1) + "%";
                    });

                chart
                    .append("g")
                    .attr("id", "canadaLineG")
                    .append("path")
                    .attr("id", "canadaLine")
                    .datum([canadaObject, { "lineLength": 379, "ASR": canadaObject[asrCrudeToggle], "CrudeRate": canadaObject[asrCrudeToggle] }])
                    .style("fill", "none")
                    .style("stroke", "black")
                    .style("stroke-dasharray", "5,5")
                    .attr("d", line);
            }
            else {
                updateGraphToggle = false;
                
                d3.select("#graphNotes").style("display","none");
                d3.select("#dottedLineNotes").style("display","none");
                d3.select("#suppressedNotes").style("display","list-item");
                
                d3.select(".barSvg")
                    .append("text")
                    .attr("x", 60)
                    .attr("y", 160)
                    .style("font-size", "16px")
                    .style("font-weight", "bold")
                    .text("There is insufficient data for this area by ");
            
                d3.select(".barSvg")
                    .append("text")
                    .attr("x", 60)
                    .attr("y", 190)
                    .style("font-size", "16px")
                    .style("font-weight", "bold")
                    .text(d3.select("#SDOH").property("value")+".");
            }
        }
        //Function to updated the current graph with new values
        function updateGraph() {
            
            let chart = d3.select("#barGraph");
            
            d3.select("#xAxis")
                .call(d3.axisBottom(xScale));

            d3.selectAll("#xAxis text")
                .style("font-size", "15px")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .call(wrap, 80);

            chart
                .selectAll(".barG")
                .data(cleanedGraphData)
                .exit()
                .remove();

            chart
                .selectAll("rect")
                .data(cleanedGraphData)
                .exit()
                .remove();

            let bargroup = chart
                .selectAll(".barG")
                .data(cleanedGraphData)
                .enter()
                .append("g")
                .attr("class", "barG");

            bargroup
                .append("rect")
                .attr("height", 0)
                .attr("width", xScale.bandwidth())
                .attr("x", function(d) {
                    return xScale(d.SDOH_Cat);
                })
                .attr("y", function(d) {
                    return yScale(d[asrCrudeToggle]) + (graphHeight - yScale(d[asrCrudeToggle]));
                });

            chart
                .selectAll("rect")
                .transition()
                .duration(700)
                .attr("width", xScale.bandwidth())
                .attr("class", "dataBars")
                .style("fill", "rgb(72, 133, 237)")
                .attr("x", function(d) {
                    return xScale(d.SDOH_Cat);
                })
                .attr("y", function(d) {
                    return yScale(d[asrCrudeToggle]);
                })
                .attr("height", function(d) {
                    return graphHeight - yScale(d[asrCrudeToggle]);
                });

            chart
                .selectAll(".line-length")
                .data(cleanedGraphData)
                .exit()
                .remove();

            chart
                .selectAll(".line-top")
                .data(cleanedGraphData)
                .exit()
                .remove();

            chart
                .selectAll(".line-bottom")
                .data(cleanedGraphData)
                .exit()
                .remove();
            
            //Remaking off the error bars for the transition
            bargroup
                .append("line")
                .attr("class", "line-length")
                .attr("x1", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            bargroup
                .append("line")
                .attr("class", "line-top")
                .attr("x1", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            bargroup
                .append("line")
                .attr("class", "line-bottom")
                .attr("x1", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            //Error bars transition
            chart
                .selectAll(".line-length")
                .transition()
                .duration(700)
                .style("stroke", "black")
                .attr("x1", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            chart
                .selectAll(".line-top")
                .transition()
                .duration(700)
                .style("stroke", "black")
                .attr("x1", function(d) {
                    return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) - xScale.bandwidth() / 4;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) + xScale.bandwidth() / 4;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            chart
                .selectAll(".line-bottom")
                .transition()
                .duration(700)
                .style("stroke", "black")
                .attr("x1", function(d) {
                    return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) - xScale.bandwidth() / 4;
                })
                .attr("y1", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                })
                .attr("x2", function(d) {
                    return (xScale(d.SDOH_Cat) + xScale.bandwidth() / 2) + xScale.bandwidth() / 4;
                })
                .attr("y2", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) - (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2);
                });

            chart
                .selectAll(".barText")
                .data(cleanedGraphData)
                .exit()
                .remove();

            bargroup
                .append("text")
                .attr("class", "barText")
                .attr("x", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y", function(d) {
                    return yScale(Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_" + significantASRCrudeToggle])/2) - 10;
                });

            chart
                .selectAll(".barText")
                .data(cleanedGraphData)
                .transition()
                .duration(700)
                .attr("class", "barText")
                .style("text-anchor", "middle")
                .style("font-weight", "bold")
                .attr("x", function(d) {
                    return xScale(d.SDOH_Cat) + xScale.bandwidth() / 2;
                })
                .attr("y", function(d) {
                    return yScale(d[asrCrudeToggle] == 0 ? 0 : Number(d[asrCrudeToggle]) + (d[asrCrudeToggle] - d["Lower_CI_"+ significantASRCrudeToggle])/2) - 10;
                })
                .tween("text", function(d) {
                    let item = d3.select(this);
                    if (item.property("previousValue") === undefined)
                        item.property("previousValue", d[asrCrudeToggle]);
                    let i = d3.interpolateNumber(item.property("previousValue"), d[asrCrudeToggle]);
                    if (d[asrCrudeToggle] === "" || d[asrCrudeToggle] === 0) {
                        item.text("No Data");
                        item.property("previousValue", 0);
                    }
                    else {
                        item.property("previousValue",d[asrCrudeToggle]);
                        return function(t) { item.text(d3.format(".1f")(i(t)) + "%"); };
                    }
                });
                
            d3.select("#canadaLine")
                .datum([canadaObject, { "lineLength": 379, "ASR": canadaObject[asrCrudeToggle], "CrudeRate": canadaObject[asrCrudeToggle] }])
                .transition()
                .duration(700)
                .attr("d", line);
        }
    }
    catch (e) {
        console.log(e);
            d3.select("#graphNotes").style("display","none");
            d3.select("#dottedLineNotes").style("display","none");
            d3.select("#suppressedNotes").style("display","list-item");
            updateGraphToggle = false;
            d3.select("#barGraph").remove();
            d3.selectAll(".barSvg text").remove();

            if(d3.select("#spinner")._groups[0][0] === null){
                d3.select(".barSvg")
                        .append("text")
                        .attr("x", 60)
                        .attr("y", 160)
                        .style("font-size", "16px")
                        .style("font-weight", "bold")
                        .text("There is insufficient data for this area by ");
                
                d3.select(".barSvg")
                    .append("text")
                    .attr("x", 60)
                    .attr("y", 190)
                    .style("font-size", "16px")
                    .style("font-weight", "bold")
                    .text(d3.select("#SDOH").property("value")+".");
            }
        }
}
