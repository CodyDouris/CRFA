let cleanedData;
let graphData;
//json object of canada data for current selection of indicator
let canadaObject;
let asrCrudeToggle = "CrudeRate";
let ecumeneToggle = false;
let updateGraphToggle = false;
let areaClicked = false;
let topojsonObjects = {};
let indicatorOrder = 
["Physical inactivity","Low fruit and vegetable consumption","Current cigarette smoking",
"Heavy alcohol drinking","Four main risk factors","Obesity","Overweight","Overweight and obesity",
"Perceived health, fair/poor","Lack of community belonging","Mood disorders","Perceived mental health, fair/poor"]
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
    let indicatorParameters = ["Physical inactivity","Low fruit and vegetable consumption","Current cigarette smoking",
"Heavy alcohol drinking","Four main risk factors","Obesity","Overweight","Overweight and obesity",
"Perceived health, fair/poor","Lack of community belonging","Mood disorders","Perceived mental health, fair/poor"]
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
                .text(element.Geography);

            switch (element.Geography) {
                case "province/territory":
                    element.Geography = "ProvincesTerritories";
                    break;
                case "health regions":
                    element.Geography = "HealthRegions";
                    break;
                case "census metropolitan areas/large census agglomerations":
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

//Creation of the bar graph according to indicator selection
d3.csv("src/csv/Graph_Data_File.csv").then(function(d) {
    let SDOHParameters = [];

    d.forEach(function(element) {
        if (!SDOHParameters.includes(element.SDOH.trim()))
            SDOHParameters.push(element.SDOH.trim());
    });
    
    //Change order of graphdropdown so employment starts
    let tempArrayElement = SDOHParameters[0];
    SDOHParameters[0] = SDOHParameters[2];
    SDOHParameters[2] = tempArrayElement;
    
    SDOHParameters.forEach(function(element) {
        d3.select("#SDOH")
                .append("option")
                .attr("value", element.trim())
                .text(element);
    })

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
        
        let geographyValue = d3.select("#Geography").property("value");
        
        if ( d3.select("#province")._groups[0][0] !== null) {
            renderGraph(d3.select("#province").property("__data__"), geographyValue);
            renderSelectedArea(d3.select("#province").property("__data__"), canadaObject, geographyValue);
        }
        else
            renderSelectedArea({ "data": canadaObject }, canadaObject, geographyValue);
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
            return d.Age_Groups_ID;
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
        
    if (this.id === "Indicator") {
        d3.select("#legendTitle")
        .attr("x", function(d){
            if(d3.select("#Indicator").property("value").length > 10)
                return (d3.select("#Indicator").property("value").length * - 6.5);
                
                return -35;
        })
        .text(this.value + " prevalence (%)");

        //Fill in the footnotes with what indicator is currently selected
        d3.select("#indicatorText").html(this.value.toLowerCase() + " prevalence (%)");
        
        //Need to check cleaned data to see what age options are avalible for which indicator
        Array.from(d3.select("#AgeGroups").property("options")).map(function(ageGroup){
            //check if an age option does not exist
            if(!cleanedData["$" + geographyValue]["$" + d3.select("#Indicator").property("value")]["$"+ageGroup.value]){ 
                d3.select("#AgeGroups").style("display","none");
                d3.select("#ageGroupSpan").style("display","inline");
                d3.select("#AgeGroups").property("selectedIndex", 0);
            }
            else {
                d3.select("#AgeGroups").style("display","inline");
                d3.select("#ageGroupSpan").style("display","none");
                
                Array.from(d3.select("#Sex").property("options")).map(function(sex){
                    //check if an sex option does not exist for age
                    if(!cleanedData["$" + geographyValue]["$" + d3.select("#Indicator").property("value")]["$"+ageGroup.value]["$"+sex.value]){
                        sex.style.display = "none";
                        d3.select("#Sex").property("selectedIndex", 0);
                    }
                    else {
                        sex.style.display = "inline";
                    } 
                });
            }
        });
    }
    else if (this.id === "ASRorCrudeRates") {
        this.value === "ASR" ?
            (asrCrudeToggle = "ASR") :
            (asrCrudeToggle = "CrudeRate");

        d3.select("#ASRNotes").html((asrCrudeToggle === "ASR" ? "<li> Rates are age-standardized to the 2011 Canadian population. </li>" : "" ));

    }
    //Adjusts the quintiles after the indicator's dropdowns have been checked
    adjustQuintiles(geographyValue);
    //Gets first item and fill out appropriate download link
    let firstItem = cleanedData["$" + d3.select("#Geography").property("value")]["$" + d3.select("#Indicator").property("value")]["$"+d3.select("#AgeGroups").property("value")]["$"+d3.select("#Sex").property("value")][0];
    //Changing download link to point to correct file for maps and graph downloads
    d3.select("#downloadMapData").property("href","./src/downloads/Maps/Maps data_"+firstItem.Indicator.replace("/","-")+"_"+(firstItem.Age_Groups_ID == 1 ? "AD":"YT")+ ".xlsx");
    d3.select("#downloadGraphData").property("href","./src/downloads/SDOH/SES data_"+firstItem.Indicator.replace("/","-") +"_"+(firstItem.Age_Groups_ID == 1 ? "AD":"YT")+".xlsx");
            
    //Updates map or renders map depending on if geography was changed
    if (this.id === "Geography"){
        //restricting user from selecting population center because there is no data present for HR and CMAs
        if(this.value !== "province/territory")
        {
            if(d3.select("#SDOH").property("value") == "Population centre or rural place of residence")
                d3.select("#SDOH").property("selectedIndex", 0);
            d3.select("#SDOH").property("options")[3].style.display = "none";
            
            //transition changed SDOH input
            d3.select("#SDOH")
                .transition()
                .duration(function() {
                    if (((d3.select("#SDOH").property("clientWidth") / 9.2) - 3.8) > 25 || 
                    d3.select("#SDOH").property("options")[d3.select("#SDOH").property("selectedIndex")].innerHTML.length > 25)
                        return 1600;
                    else
                        return 800;
                })
                .style("width", ((d3.select("#SDOH").property("options")[d3.select("#SDOH").property("selectedIndex")].innerHTML.length + 3.8) * 9.2) + "px");
            d3.select("#ecumeneButton").style("display","none");
            ecumeneToggle = false;
        }
        else {
            d3.select("#SDOH").property("options")[3].style.display = "inline";
            d3.select("#ecumeneButton").style("display","inline");
        }
            
        renderMap(geographyValue);
    }
    else
        updateMap(geographyValue);
    //Check if age is youth and removing option because there are no data for those youth
    if (this.id == "AgeGroups"){
        if(d3.select("#AgeGroups").property("value") == "youth aged 12-17 years"){
            //if(d3.select("#SDOH").property("value") == "Employment")
            d3.select("#SDOH").property("selectedIndex", 1);
            d3.select("#SDOH").property("options")[0].style.display = "none";
        }
        else {
            d3.select("#SDOH").property("selectedIndex", 0);
            d3.select("#SDOH").property("options")[0].style.display = "inline";
        }
        
    }
    //Updates current area selected or renders canada information depending on input selection
    if (this.id !== "Geography" && d3.select("#province")._groups[0][0] !== null) {
        renderGraph(d3.select("#province").property("__data__"), geographyValue);
        renderSelectedArea(d3.select("#province").property("__data__"), canadaObject, geographyValue);
    }
    else
        renderSelectedArea({ "data": canadaObject }, canadaObject, geographyValue);

    //Adjusts size on dropdown box based on text in the dropdown box
    d3.select(this)
        .transition()
        .duration(function() {
            if (((d3.select(this).property("clientWidth") / 9.2) - 3.8) > 25 || this.options[this.options.selectedIndex].innerHTML.length > 25)
                return 1600;
            else
                return 800;
        })
        .style("width", ((this.options[this.options.selectedIndex].innerHTML.length + 3.8) * 9) + "px");
        
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
    d3.select("#indMeasure").html(firstArea.data.Indicator_Measure);
    
    d3.selectAll(".year").html(firstArea.data.Year);

    d3.select("#tableTitle").html(
        firstArea.data.Indicator_Measure +
        ","+ (asrCrudeToggle == "ASR" ? " age-standardized rates":" crude rates")+", among Canadian " +
        firstArea.data.Age_Groups +
        ", by " +
        firstArea.data.Geography +
        ", " +
        firstArea.data.Sex +
        ", " +
        firstArea.data.Year
    );
    
    d3.select("#PopNotes").html(firstArea.data.Age_Groups.charAt(0).toUpperCase() + firstArea.data.Age_Groups.slice(1) + ", " + firstArea.data.Sex + " by " + firstArea.data.Geography);

    //Change footnotes of map based on the geography selected
    //Footnotes change based on geography, age, and indicator
    let geographySelection = d3.select("#Geography").property("options");
    let indicatorSelection = d3.select("#Indicator").property("options");
    let ageSelection = d3.select("#AgeGroups").property("options");
    
    let geo_value = geographySelection[geographySelection.selectedIndex].attributes.geo_value.value;
    let indicator_value = indicatorSelection[indicatorSelection.selectedIndex].attributes.indicator_value.value;
    let age_value = ageSelection[ageSelection.selectedIndex].attributes.age_value.value;
    let geoNotes = "";
    //add tool tips
    Object.keys(mapFootnotes).forEach(function(geo_indicator) {
        if (geo_indicator.includes(geo_value))
            Object.keys(mapFootnotes[geo_indicator]).forEach(function(age_indicator) {
                if (age_indicator.includes(age_value))
                    Object.keys(mapFootnotes[geo_indicator][age_indicator]).forEach(function(indicator) {
                        //Accounts for single indicator ids that would match "1" such as "12"
                        if(!indicator.includes(",") && indicator != "$"+indicator_value)
                            geoNotes += "";
                        else if (indicator.includes(indicator_value))
                            if(geo_indicator == "$3")
                                geoNotes = "<li>" + mapFootnotes[geo_indicator][age_indicator][indicator][0].Footnote + "</li>" + geoNotes;
                            else
                                geoNotes += "<li>" + mapFootnotes[geo_indicator][age_indicator][indicator][0].Footnote + "</li>";
            });
            });
    });

    d3.select("#GeoNotes").html(geoNotes);

    //Checks to see if browser is IE and stop displaying download map button
    if (!(window.navigator.userAgent.indexOf("Trident/") > 0))
    //Timeout so that map loads correctly before downlaod is created
        setTimeout(function() {  changeDownload(firstArea.data.Geography); }, 500);
    else{
        d3.select("#downloadMap").style("display", "none");
        d3.select("#mapContainer").attr("class","col-lg-6");
        d3.select("#infoDiv").attr("class","col-lg-6");
        d3.select(".barSvg").attr("id","barSvgIE");
    }
        
    //Removing old table for creation of new table
    d3.select("#tableContents").remove();
    
    //Creating new table based on new parameters given
    let table = d3
        .select("#tableDiv")
        .append("div")
        .attr("id", "tableContents")
        .append("table")
        .attr("id", "dataTable")
        .attr("class", "wb-tables table table-striped table-hover")
        .attr("data-wb-tables", '{ "lengthMenu" : [ [14, 25, 50, -1], [14, 25, 50, "All"] ], "scrollX" : true,"columns": [null,{ "orderable": false },{ "type": "num-fmt" },{ "orderable": false },{ "orderable": false }]}');//{ "type": "num-fmt" }
        
    let header = table.append("thead").append("tr");
    header.append("th").text("Geography");
    header.append("th").text("");
    header.append("th").text("Prevalence (%)");
    header.append("th").text("");
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
            currRow.append("td").text(firstArea.data.Geography ==  "province/territory" ? capitalize(currData.Geo_Label) : currData.Geo_Label);
            if (currData[asrCrudeToggle] === "") {
                currRow.append("td").text("F");
                currRow.append("td").text("");
                currRow.append("td").text("F");
                currRow.append("td").text("");
            }
            else {
                if (asrCrudeToggle === "ASR") {
                    currRow.append("td").html(""+(currData.CV_ASR_Interpret === "2" ? "E" : (currData.CV_ASR_Interpret === "1" ? "F" : "")));
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1));
                    currRow.append("td").text("");
                    currRow
                        .append("td")
                        .text(Number(currData.Lower_CI_ASR).toFixed(1) + " - " + Number(currData.Upper_CI_ASR).toFixed(1));
                }
                else {
                    currRow.append("td").html(""+(currData.CV_Cr_Interpret === "2" ? "E" : (currData.CV_Cr_Interpret === "1" ? "F" : "")));
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1));
                    currRow.append("td").text("");
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
    //try and catch in place for things like youth on indicators that dont support the youth selection
    try {
    let currentArray = cleanedData["$" + geographyChange]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")];
            
    let maxData = d3.max(currentArray, function(d){ return parseFloat(d[asrCrudeToggle])})
    let minData = d3.min(currentArray, function(d){ return parseFloat(d[asrCrudeToggle])})
    let quintileSub = ((maxData - minData) / 5).toFixed(1);//quntile change rate
    
    quintileArray = [{
                "colour": "#006837",
                "upperbound": 100,
                "lowerbound": maxData - quintileSub,
                "width": 101
            },
            {
                "colour": "#31a354",
                "upperbound": (maxData - quintileSub) - 0.1,
                "lowerbound": maxData - quintileSub*2,
                "width": 87
            },
            {
                "colour": "#78c679",
                "upperbound": (maxData - quintileSub*2) - 0.1,
                "lowerbound": maxData - quintileSub*3,
                "width": 72
            },
            {
                "colour": "#c2e699",
                "upperbound": (maxData - quintileSub*3) - 0.1,
                "lowerbound": maxData - quintileSub*4,
                "width": 56
            },
            {
                "colour": "#f5f5c1",
                "upperbound": (maxData - quintileSub*4) - 0.1,
                "lowerbound": 0,
                "width": 42
            },
            {
                "colour": "white",
                "upperbound": "none",
                "lowerbound": "none",
                "width": 27
            }
        ];
    }
    catch(e){
      console.log(e);  
    }
}

//Function to change download link when map changes to reflect map changes
function changeDownload(name) {
    let svg = $("#map").clone()[0];
    
    // d3.select(svg)
    //     .selectAll("path[type=area]")
    //     .transition()
    //     .duration(1000)
    //     .style("fill", function(d) {
    //         return returnColor(d);
    //     });
            
    svg.firstChild.style = "opacity: 1";
    svg.viewBox.baseVal.height = 750;
    svg.viewBox.baseVal.width = 700;
    svg.viewBox.baseVal.y = -63;
    svg.viewBox.baseVal.x = -100;
    
    if(name.includes("province/territory")){
        d3.select(svg)
            .selectAll(".areaText")
            .data(cleanedData["$" + d3.select("#Geography").property("value")]
            ["$" + d3.select("#Indicator").property("value")]
            ["$" + d3.select("#AgeGroups").property("value")]
            ["$" + d3.select("#Sex").property("value")])
            .enter()
            .append("text")
            .attr("dx", function(d){ 
                if(d == undefined)
                    return 0;
                if(d["GEO_Code"] == 0)
                    return 0;
                switch(Number(d["GEO_Code"])){
                    case 10: return 463; //NL
                    case 11: return 550; //PEI
                    case 12: return 540; //NS
                    case 13: return 460; //NB
                    case 24: return 400; //QC
                    case 35: return 300; //ON
                    case 46: return 220; //MAN
                    case 47: return 160; //SAS
                    case 48: return 100; //ALB
                    case 59: return 35; //BC
                    case 60: return 35; //YU
                    case 61: return 120; //NW
                    case 62: return 230; //NU
                    
            }})
            .attr("dy", function(d){
                if(d == undefined)
                    return 0;
                if(d["GEO_Code"] == 0)
                    return 0;
                switch(Number(d["GEO_Code"])){
                    case 10: return 395;
                    case 11: return 460;
                    case 12: return 510;
                    case 13: return 545;
                    case 24: return 440;
                    case 35: return 470;
                    case 46: return 430;
                    case 47: return 420;
                    case 48: return 410;
                    case 59: return 390;
                    case 60: return 260; 
                    case 61: return 280; 
                    case 62: return 300; 
                }})
            .style("fill", function(){
                if(name === "province/territoryEcumene")
                    return "red";
                return "black";
            })
            .style("font-size","16px")
            .style("font-weight", "bold")
            .html(function(d){
                let significantASRCrudeToggle = (asrCrudeToggle === "ASR" ? "ASR" : "Cr");
                if(d[asrCrudeToggle] == "")
                    return "";
                if(d["GEO_Code"] == 0)
                    return "";
                return d[asrCrudeToggle] + "%" + 
                (Number(d["Lower_CI_" + significantASRCrudeToggle]) <= Number(canadaObject["Upper_CI_" + significantASRCrudeToggle]) && 
            Number(d["Upper_CI_" + significantASRCrudeToggle]) >= Number(canadaObject["Lower_CI_" + significantASRCrudeToggle]) ? "":"*");
            });
            
            //Three lines
            d3.select(svg) //PEI
                .append("line")
                .style("stroke", "black")
                .attr("x1", 550)     
                .attr("y1", 455)      
                .attr("x2", 520)     
                .attr("y2", 472);
                
            d3.select(svg) //NS
                .append("line")
                .style("stroke", "black")
                .attr("x1", 540)     
                .attr("y1", 500)      
                .attr("x2", 520)     
                .attr("y2", 490);
                
            d3.select(svg) //NB
                .append("line")
                .style("stroke", "black")
                .attr("x1", 470)     
                .attr("y1", 530)      
                .attr("x2", 490)     
                .attr("y2", 480);
                
            d3.select(svg)
                .select("#allTag")
                .remove();
                
            d3.select(svg)
                .select("#circleContainer")
                .append("text")
                .attr("dx", -20)
                .attr("dy", 7)
                .style("fill", "black")
                .style("font-weight", "bold")
                .text(canadaObject[asrCrudeToggle]+"%");
            
    } else {
        d3.select(svg)
            .select("#circleContainer")
            .remove();
    }
    
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
 
        footerImage.src = "./src/img/exportServer-en-ca.png";

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
            ctx.font = "bold 14px Noto Sans, sans-serif";

            let pngTitle = d3.select("#tableTitle").html();
            
            // ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("amoung")) + ",", 0, 25);
            // pngTitle = pngTitle.slice(pngTitle.indexOf("amoung")).split(", ");
            
            ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("Canadian")+8) + ",", 0, 25);
            pngTitle = pngTitle.slice(pngTitle.indexOf("Canadian")+8).split(", ");

            // ctx.fillText(pngTitle[0] + ",", 0, 50);
            // ctx.fillText(pngTitle[1] + ", " + pngTitle[2], 0, 75);
            
            ctx.fillText(pngTitle[0] + "," + pngTitle[1] + ", "+ pngTitle[2], 0, 50);
            
            ctx.font = "bold 14px Noto Sans, sans-serif";
            ctx.fillText("Data Source: ", 0, 575);
            
            ctx.font = "14px Noto Sans, sans-serif";
            ctx.fillText( d3.select("#dataSource").text(), 90, 576);
            
            ctx.font = "11px Noto Sans, sans-serif";
            
            if(name !== "province/territoryEcumene")
                ctx.fillText("White areas represent sparsely populated areas for which data was not available or estimates were suppressed due to high sampling variability.",0,622);
            if(name == "census metropolitan areas/large census agglomerations"){
                ctx.fillText("This data includes all Census Metropolitan Areas (CMAs), Census Agglomerations (CAs) and the territorial capitals (i.e. Yellowknife (CA), Nunavut (CA)",0,590)
                ctx.fillText("and the city of Iqaluit (Census Subdivision)). Large CAs refers to those for which sufficient data is available to provide reliable estimates.",0,605)
            }
            if(name == "health regions")
                ctx.fillText("Health regions are defined by the provinces and represent administrative areas or regions of interest to health authorities.",0,605)
            if(name.includes("province/territory")){
                ctx.fillText("*Significantly different from the national average (determined based on non-overlapping 95% confidence intervals).",0,604);
                //ctx.fillText("White areas represent sparsely populated areas for which data was not available or estimates were suppressed due to high sampling variability.",0,616);
                if(name == "province/territoryEcumene"){
                    ctx.fillText("Population ecumene is a term used to indicate land with a minimum population density.",0,619);
            
                    ctx.fillText("Displaying the population ecumene on a map, limits the display of data to only those areas where population is concentrated.",0,632);
                }
            }
            ctx.fillText("For more information visit https://health-infobase.canada.ca/crfa.", 0, 646);
            
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
        if(d.data[asrCrudeToggle] === "") return "white";
        else if (Number(d.data[asrCrudeToggle]) <= quintileArray[4].upperbound.toFixed(1)) return "#EAEAB9";
        else if (Number(d.data[asrCrudeToggle]) <= quintileArray[3].upperbound.toFixed(1)) return "#c2e699";
        else if (Number(d.data[asrCrudeToggle]) <= quintileArray[2].upperbound.toFixed(1)) return "#78c679";
        else if (Number(d.data[asrCrudeToggle]) <= quintileArray[1].upperbound.toFixed(1)) return "#31a354";
        else if (Number(d.data[asrCrudeToggle]) >= quintileArray[0].lowerbound.toFixed(1)) return "#006837";
    }
    catch (e) {
        return "white";
    }
}