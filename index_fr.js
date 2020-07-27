let cleanedData;
let graphData;
//json object of canada data for current selection of indicator
let canadaObject;
let asrCrudeToggle = "CrudeRate";
let ecumeneToggle = false;
let updateGraphToggle = false;
let areaClicked = false;
let topojsonObjects = {};
let graphFootnotes;
let geoCodeFormat;
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
d3.csv("src/csv/Map_Data_File_fr.csv").then(function(data) {
    let indicatorParameters = ["Inactivité physique","Faible consommation de fruits et de légumes","Tabagisme actuel",
"Forte consommation d’alcool","Quatre principaux facteurs de risque","Obésité","Surpoids","Surpoids et obésité",
"Santé perçue, passable ou mauvaise","Manque de sentiment d’appartenance à la collectivité","Troubles de l’humeur","Santé mentale perçue, passable ou mauvaise"]
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
                case "province ou territoire":
                    element.Geography = "ProvincesTerritories";
                    break;
                case "régions sociosanitaires":
                    element.Geography = "HealthRegions";
                    break;
                case "régions métropolitaines de recensement ou grandes agglomérations de recensement":
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
d3.csv("src/csv/Graph_Data_File_fr.csv").then(function(d) {
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
d3.csv("src/csv/IDs_Footnotes_fr.csv").then(function(d) {
    graphFootnotes = d3
        .nest()
        .key(function(d) {
            return d.SDOH;
        })
        .map(d);
});

//Reading in footnotes associated with the map and its dropdown options
d3.csv("src/csv/IDs_Footnotes_Geo_fr.csv").then(function(d) {
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

d3.csv("src/csv/GeoCode_French_Format.csv").then(function(d) {
    geoCodeFormat = d3
        .nest()
        .key(function(d) {
            return d.GEO_Code;
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
                return (d3.select("#Indicator").property("value").length * - 7.5);
                
                return -35;
        })
        .html(this.value + " prévalence (%)");

        //Fill in the footnotes with what indicator is currently selected
        d3.select("#indicatorText").html(this.value.toLowerCase() + " prévalence (%)");
        
        //Need to check cleaned data to see what options are avalible for which indicator
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

        d3.select("#ASRNotes").html((asrCrudeToggle === "ASR" ? "<li> Les taux sont normalisés selon l’âge de la population canadienne en 2011. </li>" : "" ));

    }
    //Adjusts the quintiles after the indicator's dropdowns have been checked
    adjustQuintiles(geographyValue);
    
    //Gets first item and fill out appropriate download link
    let firstItem = cleanedData["$" + d3.select("#Geography").property("value")]["$" + d3.select("#Indicator").property("value")]["$"+d3.select("#AgeGroups").property("value")]["$"+d3.select("#Sex").property("value")][0];
    //Changing download link to point to correct file for maps and graph downloads
    d3.select("#downloadMapData").property("href","/src/downloads/cartes/Donnees_pour_les_cartes_"+firstItem.Indicator.replace(", ","-").replace("/ /g","_").replace("’","").replace("é","e").replace("à ","a").replace("ç","c").replace(" ","")+"_"+(firstItem.Age_Groups_ID == 1 ? "AD":"Jeunes")+ ".xlsx");
    d3.select("#downloadGraphData").property("href","/src/downloads/dss/Donnees_pour_les_SSE_"+firstItem.Indicator.replace(", ","-").replace(" ","_").replace("’","").replace("é","e").replace("à ","a").replace("ç","c").replace(" ","")+"_"+(firstItem.Age_Groups_ID == 1 ? "AD":"Jeunes")+".xlsx");
            
    //Updates map or renders map depending on if geography was changed
    if (this.id === "Geography"){
        //restricting user from selecting population center because there is no data present for HR and CMAs
        if(this.value !== "province ou territoire")
        {
            if(d3.select("#SDOH").property("value") == "Centre de population ou zone rurale de résidence")
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
        if(d3.select("#AgeGroups").property("value").split(" ")[0] == "jeunes"){

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
        filename: d3.select("#tableTitle").html().replace("&nbsp;"," ") + ".csv"
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
        ","+ (asrCrudeToggle == "ASR" ? " taux normalisés selon l’âge":" taux bruts")+", parmi les Canadiens " +
        firstArea.data.Age_Groups +
        ", par " +
        (firstArea.data.Geography === "province ou territoireEcumene" ? "province ou territoire écoumène" : firstArea.data.Geography) +
        ", " +
        firstArea.data.Sex +
        ", " +
        firstArea.data.Year
    );
    
    d3.select("#PopNotes").html(firstArea.data.Age_Groups.charAt(0).toUpperCase() + firstArea.data.Age_Groups.slice(1) + ", " + (firstArea.data.Geography === "province ou territoireEcumene" ? "province ou territoire écoumène" : firstArea.data.Geography));

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
    else {
        d3.select("#downloadMap").style("display", "none");
        d3.select("#mapContainer").attr("class","col-lg-6");
        d3.select("#infoDiv").attr("class","col-lg-6");
        d3.select(".barSvg").attr("id","barSvgIE");
    }
        
    //Removing old table for creation of new table
    d3.select("#tableContents").remove();
    
    //Creating new table based on new parameters given
    //add french json for data-table
    let table = d3
        .select("#tableDiv")
        .append("div")
        .attr("id", "tableContents")
        .append("table")
        .attr("id", "dataTable")
        .attr("class", "wb-tables table table-striped table-hover")
        .attr("data-wb-tables", "{ \"lengthMenu\" : [ [14, 25, 50, -1], [14, 25, 50, \"All\"] ], \"scrollX\" : true,\"columns\": [null,{ \"orderable\": false },{ \"type\": \"num-fmt\" },{ \"orderable\": false },{ \"orderable\": false }],\"language\": {\n    \"sEmptyTable\":     \"Aucune donn\xE9e disponible dans le tableau\",\n    \"sInfo\":           \"Affichage de l'\xE9l\xE9ment _START_ \xE0 _END_ sur _TOTAL_ \xE9l\xE9ments\",\n    \"sInfoEmpty\":      \"Affichage de l'\xE9l\xE9ment 0 \xE0 0 sur 0 \xE9l\xE9ment\",\n    \"sInfoFiltered\":   \"(filtr\xE9 \xE0 partir de _MAX_ \xE9l\xE9ments au total)\",\n    \"sInfoPostFix\":    \"\",\n    \"sInfoThousands\":  \",\",\n    \"sLengthMenu\":     \"Afficher _MENU_ \xE9l\xE9ments\",\n    \"sLoadingRecords\": \"Chargement...\",\n    \"sProcessing\":     \"Traitement...\",\n    \"sSearch\":         \"Rechercher :\",\n    \"sZeroRecords\":    \"Aucun \xE9l\xE9ment correspondant trouv\xE9\",\n    \"oPaginate\": {\n        \"sFirst\":    \"Premier\",\n        \"sLast\":     \"Dernier\",\n        \"sNext\":     \"Suivant\",\n        \"sPrevious\": \"Pr\xE9c\xE9dent\"\n    },\n    \"oAria\": {\n        \"sSortAscending\":  \": activer pour trier la colonne par ordre croissant\",\n        \"sSortDescending\": \": activer pour trier la colonne par ordre d\xE9croissant\"\n    },\n    \"select\": {\n            \"rows\": {\n                \"_\": \"%d lignes s\xE9lectionn\xE9es\",\n                \"0\": \"Aucune ligne s\xE9lectionn\xE9e\",\n                \"1\": \"1 ligne s\xE9lectionn\xE9e\"\n            } \n    }\n}}");//{ "type": "num-fmt" }
        
    let header = table.append("thead").append("tr");
    header.append("th").text("Géographie");
    header.append("th").text("");
    header.append("th").text("Prévalence (%)");
    header.append("th").text("");
    header.append("th").text("95% IC");
    table = table.append("tbody");
    allAreas.forEach(function(currItem) {
        let currData = 0;

        if (currItem.data)
            currData = currItem.data;

        else if (currItem.__data__ && currItem.__data__.data)
            currData = currItem.__data__.data;

        if (currData !== 0) {
            let currRow = table.append("tr");
            currRow.append("td").text(firstArea.data.Geography ==  "province ou territoire" ? capitalize(currData.Geo_Label) : currData.Geo_Label); //////////////////dunno about this change since the shapefiles don't change
            if (currData[asrCrudeToggle] === "") {
                currRow.append("td").text("F");
                currRow.append("td").text("");
                currRow.append("td").text("F");
                currRow.append("td").text("");
            }
            else {
                if (asrCrudeToggle === "ASR") {
                    currRow.append("td").html(""+(currData.CV_ASR_Interpret === "2" ? "E" : (currData.CV_ASR_Interpret === "1" ? "F" : "")));
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1).toString().replace(".",","));
                    currRow.append("td").text("");
                    currRow
                        .append("td")
                        .text(Number(currData.Lower_CI_ASR).toFixed(1).toString().replace(".",",") + " - " + Number(currData.Upper_CI_ASR).toFixed(1).toString().replace(".",","));
                }
                else {
                    currRow.append("td").html(""+(currData.CV_Cr_Interpret === "2" ? "E" : (currData.CV_Cr_Interpret === "1" ? "F" : "")));
                    currRow.append("td").html(Number(currData[asrCrudeToggle]).toFixed(1).toString().replace(".",","));
                    currRow.append("td").text("");
                    currRow
                        .append("td")
                        .text(Number(currData.Lower_CI_Cr).toFixed(1).toString().replace(".",",") + " - " + Number(currData.Upper_CI_Cr).toFixed(1).toString().replace(".",","));
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
            
    svg.firstChild.style = "opacity: 1";
    svg.viewBox.baseVal.height = 750;
    svg.viewBox.baseVal.width = 700;
    svg.viewBox.baseVal.y = -76;
    svg.viewBox.baseVal.x = -100;
    
    if(name.includes("province ou territoire")){
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
                if(name === "province ou territoireEcumene")
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
                return d[asrCrudeToggle].toString().replace(".",",") + "%" + 
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
                .text(canadaObject[asrCrudeToggle].toString().replace(".",",")+"%");
            
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
        footerImage.src = "./src/img/exportServer-fr-ca.png";

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
            ctx.font = "bold 12.5px Noto Sans, sans-serif";

            let pngTitle = d3.select("#tableTitle").html();
            
            pngTitle = pngTitle.replace("&nbsp;"," ");
            
            ctx.fillText(pngTitle.slice(0,100).slice(0,pngTitle.slice(0,100).lastIndexOf(" ")), 0, 25);
            pngTitle = pngTitle.slice(pngTitle.slice(0,100).lastIndexOf(" ")+1).replace("&nbsp;"," ");
            if(pngTitle.length > 100){
                ctx.fillText(pngTitle.slice(0,100).slice(0,pngTitle.slice(0,100).lastIndexOf(" ")), 0, 40);
                pngTitle = pngTitle.slice(pngTitle.slice(0,100).lastIndexOf(" ")+1).replace("&nbsp;"," ");
                ctx.fillText(pngTitle, 0, 55);
            }
            else
                ctx.fillText(pngTitle, 0, 40);
            //Another option for displaying french png title
            // if(pngTitle.slice(0, pngTitle.indexOf("Canadiens")+9).length < 75){
            //     ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("Canadiens")+9), 0, 25);
            //     pngTitle = pngTitle.slice(pngTitle.indexOf("Canadiens")+9).split(", ");
            //     ctx.fillText(pngTitle[0] + ", " + pngTitle[1] + ", "+ pngTitle[2] +", "+pngTitle[3], 0, 50);
            // } else {
            //     ctx.fillText(pngTitle.slice(0, pngTitle.indexOf("taux")-2), 0, 25);
            //     pngTitle = pngTitle.slice(pngTitle.indexOf("taux")).replace("&nbsp;"," ").split(", ");
            //     if(pngTitle[2].length > 50 || (pngTitle[0].length + pngTitle[1].length) > 50){
            //         ctx.fillText(pngTitle[0] + ", " + pngTitle[1] + "," , 0, 40);
            //         ctx.fillText(pngTitle[2] + ", " + pngTitle[3] + ", "+ pngTitle[4], 0, 55);
            //     }
            //     else
            //         ctx.fillText(pngTitle[0] + ", " + pngTitle[1] + ", " + pngTitle[2] + ", " + pngTitle[3] + ", "+ pngTitle[4], 0, 40);
            // }
            
            ctx.font = "bold 13.5px Noto Sans, sans-serif";
            ctx.fillText("Source de données : ", 0, 575);
            
            ctx.font = "13.5px Noto Sans, sans-serif";
            ctx.fillText( d3.select("#dataSource").text(), 137, 576);
            
            ctx.font = "10.5px Noto Sans, sans-serif";
            
            if(name !== "province ou territoireEcumene" && name !== "régions métropolitaines de recensement ou grandes agglomérations de recensement"){
                ctx.fillText("Les zones blanches représentent les zones faiblement peuplées pour lesquelles les données n’étaient pas disponibles ou les estimations ont été ",0,620);
                ctx.fillText("supprimées en raison de la forte variabilité d’échantillonnage.",0,633);
            }
            if(name == "régions métropolitaines de recensement ou grandes agglomérations de recensement"){
                ctx.fillText("Ces données comprennent toutes les régions métropolitaines de recensement (RMR), les agglomérations de recensement (AR) et les capitales des territoires",0,590);
                ctx.fillText("(c’est-à-dire Yellowknife [AR], Nunavut [AR] et la ville d’Iqaluit [Subdivisions de recensement]).  Les grandes AR désignent celles pour lesquelles on dispose de ",0,605);
                ctx.fillText("données suffisantes pour fournir des estimations fiables. Les zones blanches représentent les zones faiblement peuplées pour ",0,620);
                ctx.fillText("lesquelles les données n’étaient pas disponibles ou les estimations ont été supprimées en raison de la forte variabilité d’échantillonnage.",0,633);
            }
            if(name == "régions sociosanitaires"){
                ctx.fillText("Les régions sociosanitaires, définies par les provinces, correspondent à des unités ou des régions administratives qui présentent un intérêt pour les autorités ",0,595);
                ctx.fillText("en matière de santé.",0,608);
            }
            if(name.includes("province ou territoire")){
                ctx.fillText("* Différence significative par rapport à la moyenne nationale (déterminée sur la base d’intervalles de confiance à 95 % sans chevauchement).",0,608);
                
                if(name == "province ou territoireEcumene"){
                    ctx.fillText("Par écoumène de population, on entend des terres ayant au moins une certaine densité de population.",0,619);
                    ctx.fillText("L’affichage de l’écoumène de population sur une carte limite l’affichage des données à ces zones où la population est concentrée.",0,632);
                }
            }
            ctx.fillText("Pour de plus amples renseignements, visitez le https://sante-infobase.canada.ca/afrc.", 0, 646);
            
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