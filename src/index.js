//Most of the code that has to do with the geographical regions is hard coded

let cleanedData;
let areaClicked = false;
let asrCrudeToggle = "CrudeRate";
let EcumeneToggle = false;
let zooming = false;
let updateGraphToggle = false;
let average;
let canadaObject;
let target = document.getElementById("mapContainer");
let opts = {
  lines: 9,
  length: 9,
  width: 5,
  radius: 14,
  color: "#EE3124",
  speed: 1.5,
  trail: 40
};
//read in csv to dynamically fill dropdowns
d3.csv("src/csv/Indicator_by_geo_age_sex.csv").then(function(data) {
  let indicatorParameters = [];
  let ageGroupsParameters = [];
  let sexParameters = [];
  data.forEach(function(element) {
    if (!indicatorParameters.includes(element.Indicator)) {
      d3.select("#Indicator")
        .append("option")
        .attr("value", element.Indicator)
        .text(capitalize(element.Indicator));
      indicatorParameters.push(element.Indicator);
    }

    if (!ageGroupsParameters.includes(element.Age_Groups)) {
      d3.select("#AgeGroups")
        .append("option")
        .attr("value", element.Age_Groups)
        .text(capitalize(element.Age_Groups));
      ageGroupsParameters.push(element.Age_Groups);
    }

    if (!sexParameters.includes(element.Sex)) {
      d3.select("#Sex")
        .append("option")
        .attr("value", element.Sex)
        .text(capitalize(element.Sex));
      sexParameters.push(element.Sex);
    }
  });
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
  renderMap(d3.select("#Geography")._groups[0][0].value);
});

const projection = d3
  .geoIdentity(function(x, y) {
    return [x, -y];
  })
  .reflectY(true)
  .scale(0.00011)
  .translate([-450, 600]);

const path = d3.geoPath().projection(projection);

const margin = { top: 50, left: 50, right: 50, bottom: 50 };

//event listener on dropdown that selects drop down value
d3.selectAll(".input").on("change", function() {
  if (this.id === "Indicator")
    d3.select("#legendTitle").html(
      "<span class='parameters'>" + this.value + "</span> prevalence (%)"
    );
  else if (this.id === "ASRorCrudeRates")
    asrCrudeToggle === "ASR"
      ? (asrCrudeToggle = "CrudeRate")
      : (asrCrudeToggle = "ASR");

  if (this.id === "Geography")
    renderMap(d3.select("#Geography")._groups[0][0].value);
  else if(this.id === "Ecumene")
  {
    EcumeneToggle
      ? (EcumeneToggle = false)
      : (EcumeneToggle = true);
      renderMap(d3.select("#Geography")._groups[0][0].value);
  }
  else parameterChange(d3.select("#Geography")._groups[0][0].value);
  updateGraphToggle = false;
});

d3.selectAll(".legendColour")
  .on("mouseover", function(d) {
    areaClicked = false;
    let currentColor = d3.select(this)._groups[0][0].attributes;
    d3.selectAll("#map path").attr("class", "selectedArea");
    d3.selectAll("path[type=area]")
      .filter(function(d2) {
        return (
          Number(currentColor.lowerbound.value) <
            Number(d2.data[asrCrudeToggle]) &&
          Number(d2.data[asrCrudeToggle]) <
            Number(currentColor.upperbound.value)
        );
      })
      .attr("class", " ");
  })
  .on("mouseout", function(d) {
    d3.selectAll("#map path").attr("class", "");
  });

//Function renders area that is displayed when moused over
function renderSelectedArea(areaDisplay, areaAverage, geographyChange) {
  let significanceFlag;
  if (areaDisplay.data[asrCrudeToggle] < areaAverage)
    significanceFlag = "lower than the";
  else if (areaDisplay.data[asrCrudeToggle] > areaAverage)
    significanceFlag = "higher than the";
  else significanceFlag = "not statistically different from the ";
  d3.select("#infoDiv")
    .transition()
    .duration(400)
    .style("opacity", "1")
    .style("display", "inline");
  d3.select("#descriptionDiv")
    .transition()
    .duration(400)
    .style("opacity", "1")
    .style("display", "inline");
  d3.select("#selectedMapDisplay").remove();
  if (!isNaN(areaDisplay.data[asrCrudeToggle])) {
    if (areaDisplay.data[asrCrudeToggle] > areaAverage)
      d3.select("#iconDiffrence").html('<i class="fas fa-angle-up"></i>');
    else if (areaDisplay.data[asrCrudeToggle] < areaAverage)
      d3.select("#iconDiffrence").html('<i class="fas fa-angle-down"></i>');
    else d3.select("#iconDiffrence").html('<i class="fas fa-equals"></i>');
    d3.select("#description").html(
      "The " +
        d3.select("#Indicator")._groups[0][0].value +
        " rates in <span class='parameters'>" +
        capitalize(areaDisplay.data.Geo_Label) +
        "</span> are <span class='parameters'>" +
        areaDisplay.data[asrCrudeToggle] +
        "</span>%. This is <span class='parameters'>" +
        significanceFlag +
        "</span> national average of <span class='parameters'>" +
        Math.round(areaAverage * 10) / 10 +
        "</span>%."
    );
  } else {
    d3.select("#description").html("There is Insufficient data for this area.");
    d3.select("#iconDiffrence").html("");
  }

  d3.select("#selectedMap")
    .append("svg")
    .attr("height", "200px")
    .attr("width", "100%")
    .attr("id", "selectedMapDisplay")
    .attr("viewBox", "40 10 200 250")
    .append("g")
    .attr("transform", "scale(0.4) ")
    .attr("background", "#cfcf9f")
    .attr("id", "selectedAreaG");

  d3.select("#selectedAreaG")
    .selectAll(".selectedArea")
    .data([areaDisplay])
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", function(d) {
      if (d.data[asrCrudeToggle] <= 18.85) return "#ffffcc";
      else if (d.data[asrCrudeToggle] <= 25.09) return "#c2e699";
      else if (d.data[asrCrudeToggle] <= 31.34) return "#78c679";
      else if (d.data[asrCrudeToggle] <= 37.59) return "#31a354";
      else if (d.data[asrCrudeToggle] > 37.59) return "#006837";
      else return "white";
    })
    .attr("stroke", "#333333");

  const svgContainer = d3.select("#selectedMap svg path");
  const BBox = svgContainer.node().getBBox();
  let scale = "";
  const BBoxHeight = BBox.height;
  const BBoxWidth = BBox.width;
  if (BBoxHeight >= BBoxWidth) {
    scale = 2000000 / BBoxHeight;
  } else if (BBoxWidth > BBoxHeight) {
    scale = 2000000 / BBoxWidth;
  } else {
    scale = 1;
  }

  const newMatrix = buildNewMatrix(scale, BBoxWidth, BBoxHeight);
  $("#selectedMap svg path").attr("d", newMatrix);

  svgContainer.attr("stroke-width", 1 / scale).attr("stroke", "#333");

  $("#selectedAreaG path").attr("stroke-width", 1 / (0.0001 * scale));
  $("#selectedAreaG").attr("transform", "scale(" + 0.0001 * scale + ")");

  renderGraph(areaDisplay, geographyChange);
}

//function that creates new matrix of the selected area
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
      } else {
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

//Function renders the map that is slected in geography dropdown
function renderMap(geographyChange) {
  areaClicked = false;
  let xZoom = 0;
  let yZoom = 0;
  let kZoom = 1;
  d3.select("#map").remove();
  const mapSVG = d3
    .select("#mapContainer")
    .append("svg")
    .attr("height", "580px")
    .attr("width", "100%")
    .attr("id", "map")
    .attr("viewBox", "0 0 600 550")
    .call(
      //Zoom functionality on the map
      d3.zoom().on("zoom", function() {
        if (d3.event.sourceEvent != null)
          if (zooming) {
            xZoom = d3.event.transform.x;
            yZoom = d3.event.transform.y;
            kZoom = d3.event.transform.k;
            mapSVG.attr("transform", d3.event.transform);
          } else {
            if (d3.event.sourceEvent.wheelDelta > 0) window.scrollBy(0, -50);
            if (d3.event.sourceEvent.wheelDelta < 0) window.scrollBy(0, 50);
            d3.event.transform.x = xZoom;
            d3.event.transform.y = yZoom;
            d3.event.transform.k = kZoom;
          }
      })
    )
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .attr("background", "#cfcf9f");

  let spinner = new Spinner(opts).spin(target);

  d3.json("src/json/" + geographyChange + ".json").then(function(data) {
    const area = topojson.feature(data, data["objects"][geographyChange])
      .features;
      
  d3.json("src/json/ProvincesTerritories.json").then(function(backgroundData) {
      
  d3.json("src/json/"+geographyChange+"Ecumene.json").then(function(ecumeneData) {
      
      const ecumene = topojson.feature(
          ecumeneData,
          ecumeneData["objects"][geographyChange+"Ecumene"]
        ).features;
        
      switch (geographyChange) {
        case "ProvincesTerritories":
          geographyChange = "province/territory";
          break;
        case "HealthRegions":
          geographyChange = "Health Regions";
          break;
        case "CensusMetropolitanAreas":
          geographyChange = "Census Metropolitan Areas/Census Agglomerations";
    }
    spinner.stop();
    //Assigning the spesific cleanedData to the area objects
    area.forEach(function(item) {
      item.data = cleanedData["$" + geographyChange][
        "$" + d3.select("#Indicator")._groups[0][0].value
      ]["$" + d3.select("#AgeGroups")._groups[0][0].value][
        "$" + d3.select("#Sex")._groups[0][0].value
      ]
        .map(function(item2) {
          switch (Number(item2.GEO_Code)) {
            case Number(item.properties.PRUID):
              return item2;
            case Number(item.properties.HR_UID):
              return item2;
            case Number(item.properties.CMA):
              return item2;
            case 0:
              canadaObject = item2;
              average = Number(item2[asrCrudeToggle]);
              break;
          }
        })
        .filter(Boolean)[0];
    });
    
      //Background provinces for the CMAS
      if (
        geographyChange === "Census Metropolitan Areas/Census Agglomerations"
      ) {
        const background = topojson.feature(
          backgroundData,
          backgroundData["objects"]["ProvincesTerritories"]
        ).features;
        mapSVG
          .selectAll(".background")
          .data(background)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "white")
          .attr("stroke", "#333333");
      }
      mapSVG
        .selectAll(".area")
        .data(area)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", function(d) {
          try {
            if (d.data[asrCrudeToggle] <= 18.85) return "#ffffcc";
            else if (d.data[asrCrudeToggle] <= 25.09) return "#c2e699";
            else if (d.data[asrCrudeToggle] <= 31.34) return "#78c679";
            else if (d.data[asrCrudeToggle] <= 37.59) return "#31a354";
            else if (d.data[asrCrudeToggle] > 37.59) return "#006837";
            else return "white";
          } catch (Exception) {
            console.log(d); //This is to catch the one region not implemented yet
          }
        })
        .attr("stroke", "#333333")
        .attr("type", "area")
        .on("click", function(d) {
          if (areaClicked) {
            areaClicked = false;
            d3.selectAll("#map path")
              .style("stroke", "#333333")
              .attr("class", "");
          } else {
            areaClicked = true;
            d3.selectAll("#map path").attr("class", "selectedArea");
            d3.select(this)
              .style("stroke", "red")
              .attr("class", "");
            renderSelectedArea(d, average, geographyChange);
          }
        })
        .on("mouseover", function(d) {
          if (!areaClicked) {
            d3.selectAll("#map path").attr("class", "selectedArea");
            d3.select(this).attr("class", "");
            renderSelectedArea(d, average, geographyChange);
          }
        })
        .on("mouseout", function(d) {
          if (!areaClicked) {
            d3.selectAll("#map path").attr("class", "");
          }
        });
      //Ecumene Background if requested
      if(EcumeneToggle){
        mapSVG
          .selectAll(".ecumene")
          .data(ecumene)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("fill", "yellow")
          .attr("stroke", "#333333")
          .style("pointer-events", "none");
      }
      //Sending info to the parameters change
      area.unshift({ data: canadaObject });
      parametersSelectedChange(area[0], area);
    });
    });
  });
}
//function to fill in the parameters selected text
function parametersSelectedChange(firstArea, allAreas) {
  d3.select("#parametersText").html(
    "<span class='parameters'>" +
      firstArea.data.Indicator_Measure +
      "</span> amoung Canadian <span class='parameters'>" +
      firstArea.data.Age_Groups +
      "</span>, by <span class='parameters'>" +
      firstArea.data.Geography +
      "</span>, <span class='parameters'>" +
      firstArea.data.Sex +
      "</span>, <span class='parameters'>" +
      asrCrudeToggle +
      "</span>, <span class='parameters'>" +
      firstArea.data.Year
  );
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
  //filling graph parameters
  d3.select("#graphParameters").html(
    "Prevalence of <span class='parameters'>" +
      firstArea.data.Indicator +
      "</span> by "
  );
  d3.select("#dataTable").remove();
  //creating new table based on new parameters given
  let table = d3
    .select("#tableDiv")
    .append("table")
    .attr("id", "dataTable");
  let header = table.append("tr");
  header.append("th").text("Geography");
  header.append("th").text("Rate");
  header.append("th").text("95% CI");
  header.append("th").text("CV(%)");
  allAreas.forEach(function(currItem) {
    try {
      if (currItem.data) {
        let currRow = table.append("tr");
        currRow.append("td").text(capitalize(currItem.data.Geo_Label));
        currRow.append("td").text(currItem.data[asrCrudeToggle]);
        if (asrCrudeToggle === "ASR") {
          currRow
            .append("td")
            .text(
              currItem.data.Lower_CI_ASR + " - " + currItem.data.Upper_CI_ASR
            );
          currRow.append("td").text(currItem.data.CV_ASR);
        } else {
          currRow
            .append("td")
            .text(
              currItem.data.Lower_CI_Cr + " - " + currItem.data.Upper_CI_Cr
            );
          currRow.append("td").text(currItem.data.CV_Cr);
        }
      } else {
        let currRow = table.append("tr");
        currRow.append("td").text(capitalize(currItem.__data__.data.Geo_Label));
        currRow.append("td").text(currItem.__data__.data[asrCrudeToggle]);
        if (asrCrudeToggle === "ASR") {
          currRow
            .append("td")
            .text(
              currItem.__data__.data.Lower_CI_ASR +
                " - " +
                currItem.__data__.data.Upper_CI_ASR
            );
          currRow.append("td").text(currItem.__data__.data.CV_ASR);
        } else {
          currRow
            .append("td")
            .text(
              currItem.__data__.data.Lower_CI_Cr +
                " - " +
                currItem.__data__.data.Upper_CI_Cr
            );
          currRow.append("td").text(currItem.__data__.data.CV_Cr);
        }
      }
    } catch (Exception) {
      console.log(Exception); //This is here for the unimplimented province
    }
  });
}
function parameterChange(geographyChange) {
  switch (geographyChange) {
    case "ProvincesTerritories":
      geographyChange = "province/territory";
      break;
    case "HealthRegions":
      geographyChange = "Health Regions";
      break;
    case "CensusMetropolitanAreas":
      geographyChange = "Census Metropolitan Areas/Census Agglomerations";
  }
  d3.selectAll("path[type=area]")._groups[0].forEach(function(item) {
    item.__data__.data = cleanedData["$" + geographyChange][
      "$" + d3.select("#Indicator")._groups[0][0].value
    ]["$" + d3.select("#AgeGroups")._groups[0][0].value][
      "$" + d3.select("#Sex")._groups[0][0].value
    ]
      .map(function(item2) {
        switch (Number(item2.GEO_Code)) {
          case Number(item.__data__.properties.PRUID):
            return item2;
          case Number(item.__data__.properties.HR_UID):
            return item2;
          case Number(item.__data__.properties.CMA):
            return item2;
          case 0:
            canadaObject = item2;
            average = Number(item2[asrCrudeToggle]);
            break;
        }
      })
      .filter(Boolean)[0];
  });

  d3.selectAll("path[type=area]")
    .transition()
    .duration(1000)
    .attr("fill", function(d) {
      try {
        if (d.data[asrCrudeToggle] <= 18.85) return "#ffffcc";
        else if (d.data[asrCrudeToggle] <= 25.09) return "#c2e699";
        else if (d.data[asrCrudeToggle] <= 31.34) return "#78c679";
        else if (d.data[asrCrudeToggle] <= 37.59) return "#31a354";
        else if (d.data[asrCrudeToggle] > 37.59) return "#006837";
        else return "white";
      } catch (Exception) {
        console.log(d); //This is to catch the one region not implemented yet
      }
    });
  let allAreasArray = Array.from(d3.selectAll("path[type=area]")._groups[0]);
  allAreasArray.unshift({ __data__: { data: canadaObject } });
  parametersSelectedChange(
    d3.select("path[type=area]")._groups[0][0].__data__,
    allAreasArray
  );
}

function capitalize(str) {
  str = str.split(" ");
  str.forEach(function(element, index) {
    str[index] =
      element.substr(0, 1).toUpperCase() + element.substr(1).toLowerCase();
  });
  return str.join(" ");
}

//creation of the bar graph according to selection
let mapData = [];
let graphData;
d3.csv("src/csv/SDOH_bar_graph.csv", function(d) {
  mapData.push(d);
}).then(function() {
  let SDOHParameters = [];
  mapData.forEach(function(element) {
    if (!SDOHParameters.includes(element.SDOH.trim())) {
      d3.select("#SDOH")
        .append("option")
        .attr("value", element.SDOH.trim())
        .text(capitalize(element.SDOH));
      SDOHParameters.push(element.SDOH.trim());
    }
  });

  //nesting of data to be able to access data for graph
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
    .map(mapData);
});
function renderGraph(dataArea, geography) {
  const graphMargin = 50;
  const graphWidth = 500 - 2 * graphMargin;
  const graphHeight = 350 - 2 * graphMargin;

  //cleaned data of current area selected from graph csv
  let cleanedGraphData = graphData["$" + geography][
    "$" + d3.select("#Indicator")._groups[0][0].value
  ]["$" + d3.select("#AgeGroups")._groups[0][0].value][
    "$" + d3.select("#Sex")._groups[0][0].value
  ]["$" + d3.select("#SDOH")._groups[0][0].value]
    .map(function(item) {
      if (Number(dataArea.data.GEO_Code) === Number(item.GEO_Code) && !isNaN(item[asrCrudeToggle])) {
        return item;
      }
      else if(Number(dataArea.data.GEO_Code) === Number(item.GEO_Code) && isNaN(item[asrCrudeToggle])){
          updateGraphToggle = false;
      }
    })
    .filter(Boolean);
    
  const yScale = d3
      .scaleLinear()
      .range([graphHeight, 0])
      .domain([0, 100]);
      
  const xScale = d3
      .scaleBand()
      .range([0, graphWidth])
      .domain(cleanedGraphData.map(s => s.SDOH_Cat))
      .padding(0.5);
  if(updateGraphToggle && cleanedGraphData.length > 0)
    updateGraph()
  else{
  d3.select("#barGraph").remove();
  d3.selectAll(".barSvg text").remove();
  
  if (cleanedGraphData.length > 0) {
    updateGraphToggle = true;
    const chart = d3
      .select(".barSvg")
      .append("g")
      .attr("id", "barGraph")
      .attr("transform", `translate(${graphMargin},${graphMargin})`);

    chart.append("g").call(d3.axisLeft(yScale));

    chart
      .append("g")
      .attr("transform", `translate(0, ${graphHeight})`)
      .call(d3.axisBottom(xScale));

    chart
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft()
          .scale(yScale)
          .tickSize(-graphWidth, 0, 0)
          .tickFormat("")
      );
      
    const barGroups = chart
      .selectAll()
      .data(cleanedGraphData)
      .enter()
      .append("g");

    barGroups
      .append("rect")
      .attr("x", s => xScale(s.SDOH_Cat))
      .attr("y", s => yScale(s[asrCrudeToggle]))
      .attr("height", s => graphHeight - yScale(s[asrCrudeToggle]))
      .attr("width", xScale.bandwidth())
      .attr("class", "dataBars")
      .style("fill", "DimGrey");

    d3.select(".barSvg")
      .append("text")
      .attr("x", -(graphHeight / 2) - graphMargin)
      .attr("y", graphMargin / 2.4)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("(per 100,000 per year))");

    barGroups
      .append("text")
      .attr("x", a => xScale(a.SDOH_Cat) + xScale.bandwidth() / 2)
      .attr("y", a => yScale(a[asrCrudeToggle]) - 10)
      .attr("text-anchor", "middle")
      .attr("class","barText")
      .style("font-weight", "bold")
      .text(a => a[asrCrudeToggle] + "%");
  } else {
    updateGraphToggle = false;
    d3.select("#barGraph").remove();
    d3.selectAll(".barSvg text").remove();
    d3.select(".barSvg")
      .append("text")
      .attr("x", 100)
      .attr("y", 100)
      .style("font-weight", "bold")
      .text("There is Insufficient data for this area.");
  }
  }
  function updateGraph(){
    d3.selectAll(".barSvg rect")
      .data(cleanedGraphData)
      .transition()
      .duration(300)
      .attr("y", s => yScale(s[asrCrudeToggle]))
      .attr("height",s => graphHeight - yScale(s[asrCrudeToggle]));
    d3.selectAll(".barText")
      .data(cleanedGraphData)
      .transition()
      .duration(300)
      .attr("x", a => xScale(a.SDOH_Cat) + xScale.bandwidth() / 2)
      .attr("y", a => yScale(a[asrCrudeToggle]) - 10)
      .text(a => a[asrCrudeToggle] + "%");
}
}
d3.select("body").on("keydown", function() {
  zooming = d3.event.ctrlKey;
});

d3.select("body").on("keyup", function() {
  zooming = false;
});
