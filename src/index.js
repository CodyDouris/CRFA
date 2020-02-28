let cleanedData;
let graphData;
//json object of canada object for current selection
let canadaObject;
let asrCrudeToggle = "CrudeRate";
let ecumeneToggle = false;
let updateGraphToggle = false;
let areaClicked = false;
let topojsonObjects = {};
let graphFootnotes;
let mapFootnotes;
let quintileArray;

//Projection used for svgs
const projection = d3
    .geoIdentity(function(x, y) {
        return [x, -y];
    })
    .reflectY(true)
    .scale(0.00011)
    .translate([-450, 600]);

const path = d3.geoPath().projection(projection);

const margin = {
    top: 50,
    left: 50,
    right: 50,
    bottom: 50
};

//If browser is IE size map diffrently
if ((window.navigator.userAgent.indexOf("Trident/") > 0)) {
    d3.select("#mapContainer")
        .attr("class", "col-lg-7");
    d3.select("#infoDiv")
        .attr("class", "col-lg-5 clientHidden");
}

//Preload topojson to be used in renderMap
//Read in the Indicator csv to dynamically fill dropdowns
d3.csv("src/csv/Map_Data_File.csv").then(function(data) {
    let indicatorParameters = [];
    let ageGroupsParameters = [];
    let sexParameters = [];
    let geoParameters = [];

    //Cleans and nests data read in from csv to map more friendly
    cleanedData = d3
        .nest()
        .key(function(d) {
            return d.Geography;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Indicator;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Age_Groups;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Sex;
        })
        .sortKeys(d3.ascending)
        .map(data);

    //Fill in each dropdown with each option in loaded csv
    data.forEach(function(element, index) {
        if (!indicatorParameters.includes(element.Indicator)) {
            d3.select("#Indicator")
                .append("option")
                .attr("value", element.Indicator)
                .attr("indicator_value", element.Indicator_ID)
                .text(element.Indicator);
            indicatorParameters.push(element.Indicator);
        }
        else if (!ageGroupsParameters.includes(element.Age_Groups)) {
            d3.select("#AgeGroups")
                .append("option")
                .attr("value", element.Age_Groups)
                .attr("age_value", element.Age_Groups_ID)
                .text(element.Age_Groups);
            ageGroupsParameters.push(element.Age_Groups);
        }
        else if (!sexParameters.includes(element.Sex)) {
            d3.select("#Sex")
                .append("option")
                .attr("value", element.Sex)
                .text(element.Sex);
            sexParameters.push(element.Sex);
        }
        else if (!geoParameters.includes(element.Geography)) {
            let geoName = element.Geography;

            geoParameters.push(element.Geography);

            d3.select("#Geography")
                .append("option")
                .attr("value", element.Geography)
                .attr("geo_value", element.Geography_ID)
                .text(capitalize(element.Geography));

            switch (element.Geography) {
                case "province/territory":
                    element.Geography = "ProvincesTerritories";
                    break;
                case "Health Regions":
                    element.Geography = "HealthRegions";
                    break;
                case "Census Metropolitan Areas/Large Census Agglomerations":
                    element.Geography = "CensusMetropolitanAreas";
            }

            d3.json("src/json/" + element.Geography + ".json").then(function(areaData) {
                const area = topojson.feature(areaData, areaData["objects"][element.Geography])
                    .features;
                topojsonObjects[geoName] = area;
            });

            d3.json("src/json/" + element.Geography + "Ecumene.json").then(function(areaData) {
                const area = topojson.feature(areaData, areaData["objects"][element.Geography + "Ecumene"])
                    .features;
                topojsonObjects[geoName + "Ecumene"] = area;
                renderStartMap(geoParameters);
            });
        }
    });
});

//Creation of the bar graph according to selection
d3.csv("src/csv/Graph_Data_File.csv").then(function(d) {
    let SDOHParameters = [];

    d.forEach(function(element) {
        if (!SDOHParameters.includes(element.SDOH.trim())) {
            d3.select("#SDOH")
                .append("option")
                .attr("value", element.SDOH.trim())
                .text(element.SDOH);
            SDOHParameters.push(element.SDOH.trim());
        }
    });

    //Cleaning and Nesting of data to be able to access data for graph
    graphData = d3
        .nest()
        .key(function(d) {
            return d.Geography;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Indicator;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Age_Groups;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Sex;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.SDOH;
        })
        .sortKeys(d3.ascending)
        .map(d);
});

//Reading in footnotes associated with the graph and its dropdown options
d3.csv("src/csv/IDs_Footnotes.csv").then(function(d) {
    graphFootnotes = d3
        .nest()
        .key(function(d) {
            return d.SDOH;
        })
        .map(d);
});

//Reading in footnotes associated with the map and its dropdown options
d3.csv("src/csv/IDs_Footnotes_Geo.csv").then(function(d) {
    mapFootnotes = d3
        .nest()
        .key(function(d) {
            return d.Geography_ID;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Indicator_Measure_ID;
        })
        .sortKeys(d3.ascending)
        .key(function(d) {
            return d.Indicator_ID;
        })
        .map(d);
});

//Event listener on dropdown that selects drop down value
d3.selectAll(".input").on("change", function() {
    let geographyValue = d3.select("#Geography").property("value");
    let canadaCircleData = d3.select("#canadaCircle").property("__data__");
    
    adjustQuintiles(geographyValue);
    
    if (this.id === "Indicator") {
        d3.select("#legendTitle")
        .attr("x", function(d){
            if(d3.select("#Indicator").property("value").length > 10)
                return (d3.select("#Indicator").property("value").length * - 5.5)
                
                return -35;
        })
        .html(this.value + " prevalence (%)");

        //Fill in the footnotes with what indicator is currently selected
        d3.select("#indicatorText").html(this.value.toLowerCase() + "prevalence (%)");
    }
    else if (this.id === "ASRorCrudeRates") {
        this.value === "ASR" ?
            (asrCrudeToggle = "ASR") :
            (asrCrudeToggle = "CrudeRate");

        d3.select("#ASRNotes").html((asrCrudeToggle === "ASR" ? "<li> Rates are age-standardized to the 2011 Canadian population. </li>" : "" ));

    }

    //Makes sure user cannot select youth with ASR as there is no data for this
    if (this.id === "AgeGroups") {
        if (this.value === "youth aged 12-17 years") {
            d3.select("#CRText").style("display", "inline");
            d3.select("#ASRorCrudeRates")
                .style("display", "none")
                .style("width", "136.16px");
            d3.select("#ASRorCrudeRates").property("selectedIndex", 0);
            asrCrudeToggle = "CrudeRate";
        }
        else {
            d3.select("#CRText").style("display", "none");
            d3.select("#ASRorCrudeRates").style("display", "inline");
        }
    }
        //Changing download link to point to correct file for maps and graph downloads
        d3.select("#downloadMapData").property("href","./src/downloads/map_"+d3.select("#Indicator").property("value")
            .replace(" ","_").replace(" ","_").toLowerCase()+"_"+d3.select("#AgeGroups").property("value").split(" ")[0]+".csv");
        d3.select("#downloadGraphData").property("href","./src/downloads/graph_"+d3.select("#Indicator").property("value")
            .replace(" ","_").replace(" ","_").toLowerCase()+"_"+d3.select("#AgeGroups").property("value").split(" ")[0]+".csv");
            
    //Updates map or renders map depending on if geography was changed
    if (this.id === "Geography")
        renderMap(geographyValue);
    else
        updateMap(geographyValue);

    //Updates current area selected or renders canada information depending on input selection
    if (this.id !== "Geography" && d3.select("#province")._groups[0][0] !== null) {
        renderGraph(d3.select("#province").property("__data__"), geographyValue);
        renderSelectedArea(d3.select("#province").property("__data__"), canadaCircleData, geographyValue);
    }
    else {
        renderGraph({ "data": canadaCircleData }, geographyValue);
        renderSelectedArea({ "data": canadaCircleData }, canadaCircleData, geographyValue);
    }

    //Adjusts size on dropdown box based on text in the dropdown box
    d3.select(this)
        .transition()
        .duration(function() {
            if (((d3.select(this).property("clientWidth") / 9.2) - 3.8) > 25 || this.options[this.options.selectedIndex].innerHTML.length > 25)
                return 1600;
            else
                return 800;
        })
        .style("width", ((this.options[this.options.selectedIndex].innerHTML.length + 3.8) * 9.2) + "px");
});

//Toggles ecumene variable that affects the renderMap function
d3.select("#ecumeneButton").on("click", function() {
    ecumeneToggle
        ?
        (ecumeneToggle = false) :
        (ecumeneToggle = true);
    renderMap(d3.select("#Geography").property("value"));
});

//Event listener to download the currently displayed table as a csv
d3.select("#summaryBtn").on("click", function() {
    $("#dataTable").table2csv({
        delivery: 'value',
        filename: d3.select("#tableTitle").html() + ".csv"
    });
});

//Function to fill in the parameters selected text and table
function parametersSelectedChange(firstArea, allAreas) {
    //Changing text associated with parameters

    //Grabbing the end of the indicators string "self-reported, [adjusted BMI]" *maybe add a transition
    d3.select("#indMeasure")
        .html(firstArea.data.Indicator_Measure
            .slice(firstArea.data.Indicator_Measure.toLowerCase().indexOf(
                d3.select("#Indicator").property("value").toLowerCase()) + d3.select("#Indicator").property("value").toLowerCase().length, firstArea.data.Indicator_Measure.length));

    //Changing footnotes for graph depending on what is selected in the dropdown
    d3.select("#graphNotes").html(graphFootnotes["$" + d3.select("#SDOH").property("value")][0].SDH_Footnotes);
    
    d3.selectAll(".year").html(firstArea.data.Year);

    d3.select("#tableTitle").html(
        firstArea.data.Indicator_Measure +
        " amoung Canadian " +
        firstArea.data.Age_Groups +
        ", by " +
        firstArea.data.Geography +
        ", " +
        firstArea.data.Sex +
        ", " +
        firstArea.data.Year
    );
    
    d3.select("#PopNotes").html(capitalize(firstArea.data.Age_Groups) + ", " + capitalize(firstArea.data.Sex) + " by " + firstArea.data.Geography);

    //Change footnotes of map based on the geography selected  //////////////////currently needs to be fixed ):
    let geographySelection = d3.select("#Geography").property("options");
    let indicatorSelection = d3.select("#Indicator").property("options");
    let ageSelection = d3.select("#AgeGroups").property("options");
    
    let geo_value = geographySelection[geographySelection.selectedIndex].attributes.geo_value.value;
    let indicator_value = indicatorSelection[indicatorSelection.selectedIndex].attributes.indicator_value.value;
    let age_value = ageSelection[ageSelection.selectedIndex].attributes.age_value.value;
    let geoNotes = "";
    
    Object.keys(mapFootnotes).forEach(function(geo_indicator) {
        if (geo_indicator.includes(geo_value))
            Object.keys(mapFootnotes[geo_indicator]).forEach(function(age_indicator) {
                if (age_indicator.includes(age_value))
                    Object.keys(mapFootnotes[geo_indicator][age_indicator]).forEach(function(indicator) {
                        if (indicator.includes(indicator_value))
                            geoNotes += "<li>" + mapFootnotes[geo_indicator][age_indicator][indicator][0].Footnote + "</li>";
            });
            });
    });

    d3.select("#GeoNotes").html(geoNotes);

    //Checks to see if browser is IE and stop displaying download map button
    if (!(window.navigator.userAgent.indexOf("Trident/") > 0))
        changeDownload(firstArea.data.Geography);
    else
        d3.select("#downloadMap").style("display", "none");
        
    //Removing old table
    d3.select("#tableContents").remove();
    
    //Creating new table based on new parameters given
    let table = d3
        .select("#tableDiv")
        .append("div")
        .attr("id", "tableContents")
        .append("table")
        .attr("id", "dataTable")
        .attr("class", "wb-tables table table-striped table-hover")
        .attr("data-wb-tables", '{ "lengthMenu" : [ [14, 25, 50, -1], [14, 25, 50, "All"] ], "scrollX" : true }');
        
    let header = table.append("thead").append("tr");
    header.append("th").text("Geography");
    header.append("th").text("Proportion (%)");
    header.append("th").text("95% CI");
    table = table.append("tbody");
    allAreas.forEach(function(currItem) {
        let currData = 0;

        if (currItem.data)
            currData = currItem.data;

        else if (currItem.__data__ && currItem.__data__.data)
            currData = currItem.__data__.data;

        if (currData !== 0) {
            let currRow = table.append("tr");
            currRow.append("td").text(capitalize(currData.Geo_Label));
            if (currData[asrCrudeToggle] === "*") {
                currRow.append("td").text("F");
                currRow.append("td").text("F");
            }
            else {
                if (asrCrudeToggle === "ASR") {
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1) + (currData.CV_ASR_Interpret === "2" ? "<sup>E</sup>" : (currData.CV_ASR_Interpret === "1" ? "<sup>F</sup>" : "")));
                    currRow
                        .append("td")
                        .text(Number(currData.Lower_CI_ASR).toFixed(1) + " - " + Number(currData.Upper_CI_ASR).toFixed(1));
                }
                else {
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1) + (currData.CV_Cr_Interpret === "2" ? "<sup>E</sup>" : (currData.CV_Cr_Interpret === "1" ? "<sup>F</sup>" : "")));
                    currRow
                        .append("td")
                        .text(Number(currData.Lower_CI_Cr).toFixed(1) + " - " + Number(currData.Upper_CI_Cr).toFixed(1));
                }
            }
        }
    });
    //Re renders new data table with WET
    $(".wb-tables").trigger("wb-init.wb-tables");
}

//Calculated new quintiles bassed on the new data
function adjustQuintiles(geographyChange){
    //try and catch in place for things like youth on indicators that dont support that
    try{
    let currentArray = cleanedData["$" + geographyChange]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")];
            
    let maxData = d3.max(currentArray, function(d){ return d[asrCrudeToggle]})
    let minData = d3.min(currentArray, function(d){ return d[asrCrudeToggle]})
    let quintileSub = ((maxData - minData) / 5).toFixed(1);//quntile change
    
    quintileArray = [{
                "colour": "#006837",
                "upperbound": 100,
                "lowerbound": maxData - quintileSub
            },
            {
                "colour": "#31a354",
                "upperbound": (maxData - quintileSub) - 0.1,
                "lowerbound": maxData - quintileSub*2
            },
            {
                "colour": "#78c679",
                "upperbound": (maxData - quintileSub*2) - 0.1,
                "lowerbound": maxData - quintileSub*3
            },
            {
                "colour": "#c2e699",
                "upperbound": (maxData - quintileSub*3) - 0.1,
                "lowerbound": maxData - quintileSub*4
            },
            {
                "colour": "#f5f5c1",
                "upperbound": (maxData - quintileSub*4) - 0.1,
                "lowerbound": 0
            },
            {
                "colour": "white",
                "upperbound": "none",
                "lowerbound": "none"
            }
        ];
    }
    catch(e){
      console.log(e);  
    }
}

//Function to change download link when map changes
function changeDownload(name) {
    let svg = $("#map").clone()[0];
    svg.firstChild.style = "opacity: 1";
    svg.viewBox.baseVal.height = 700;
    svg.viewBox.baseVal.width = 700;
    svg.viewBox.baseVal.y = -40;
    svg.viewBox.baseVal.x = -120;

    let downloadLink = document.getElementById("downloadMap");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    let svgData = $('<div>').append(svg).html();

    let preface = '<?xml version="1.0" standalone="no"?>\r\n';
    let svgBlob = new Blob([preface, svgData], {
        type: "image/svg+xml;charset=utf-8"
    });

    let canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    let image = new Image();
    image.src = URL.createObjectURL(svgBlob);

    image.onload = function() {

        context.fillStyle = "white";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.drawImage(image, 0, 0);

        let footerImage = new Image();
        const lc = "en-ca";
        footerImage.src = "./src/img/exportServer-" + lc + ".png";

        footerImage.onload = function() {

            let graphHeight = canvas.height * (820 / canvas.width);
            let footerHeight = footerImage.height * (820 / footerImage.width) - 20;

            let containerCanvas = document.createElement('canvas');
            containerCanvas.width = 820;
            containerCanvas.height = graphHeight + footerHeight;
            let ctx = containerCanvas.getContext('2d');


            ctx.drawImage(canvas, 0, 0, 820, graphHeight);

            ctx.drawImage(footerImage, 0, graphHeight, 820, footerHeight);

            //Creating title for png based on user selections
            ctx.font = "bold 15.7px Noto Sans, sans-serif";

            let pngTitle = d3.select("#tableTitle").html();
            
            // ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("amoung")) + ",", 0, 25);
            // pngTitle = pngTitle.slice(pngTitle.indexOf("amoung")).split(", ");
            
            ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("Canadian")+8) + ",", 0, 25);
            pngTitle = pngTitle.slice(pngTitle.indexOf("Canadian")+8).split(", ");

            // ctx.fillText(pngTitle[0] + ",", 0, 50);
            // ctx.fillText(pngTitle[1] + ", " + pngTitle[2], 0, 75);
            
            ctx.fillText(pngTitle[0] + "," + pngTitle[1] + ", "+ pngTitle[2], 0, 50);

            ctx.fillText("Data Source: " + d3.select("#dataSource").text(), 0, 590);
            ctx.fillText("For more information please got to https://health-infobase.canada.ca.", 0, 610);
            
            downloadLink.href = containerCanvas.toDataURL("image/png");
            downloadLink.download = name + "_CRFA.png";
        };
    };
}

//Function to format Area Titles
function capitalize(str) {
    str = str.split(" ");
    str.forEach(function(element, index) {
        if (element[0] != "(")
            str[index] = element.substr(0, 1).toUpperCase() + element.substr(1).toLowerCase();
    });
    return str.join(" ");
}

//Function to wrap svg text when its too long
function wrap(text, width) {
    text.each(function() {
        let text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1,
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length != 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

//Function returns appropriate color according to data passed in
function returnColor(d) {
    try {
        if (d.data[asrCrudeToggle] <= quintileArray[4].upperbound) return "#EAEAB9";
        else if (d.data[asrCrudeToggle] <= quintileArray[3].upperbound) return "#c2e699";
        else if (d.data[asrCrudeToggle] <= quintileArray[2].upperbound) return "#78c679";
        else if (d.data[asrCrudeToggle] <= quintileArray[1].upperbound) return "#31a354";
        else if (d.data[asrCrudeToggle] >= quintileArray[0].lowerbound) return "#006837";
        else return "white";
    }
    catch (e) {
        return "white";
    }
}