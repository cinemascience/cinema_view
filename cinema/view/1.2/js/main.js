/*
A general 3D viewer for Spec-D Cinema databases

Copyright 2017 Los Alamos National Laboratory

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/


// Init variables
var databaseFile = 'cinema/view/1.2/databases.json'; //this can be overriden with HTTP params

function loadJSON(callback)
  {
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', databaseFile, true); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
	if (xobj.readyState == 4 && xobj.status == "200") {
			// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
	   }
	};
	xobj.send(null);
	}


function onlyUnique(value, index, self)
	{
		return self.indexOf(value) === index;
	}

function getLookupKey(keys, query)
	{
	   var key = "";
	    keys.forEach(function(item, index) {
	       key += query[item] + "_";
       });
	 return key;
	}

// Initialize Dropdown list from JSON
var actual_JSON;
loadJSON(function(response)
	{
	// Parse JSON string into object
	actual_JSON = JSON.parse(response);

	var dbs = [];
	for (i = 0; i < actual_JSON.length; i++)
		{
			dbs.push( actual_JSON[i].database_name );
		}

	var sel = document.getElementById('dbList');
	for (var i=0; i <actual_JSON.length; i++)
    {
		    var opt = document.createElement('option');
				opt.innerHTML = dbs[i];
				opt.value = i;
				sel.appendChild(opt);
		}
// Fill in DB
		optionSelected();
  });

function optionSelected()
	{  
// Clear image area
	   var div = document.getElementById("imageArea");
		 while(div.firstChild) {
					div.removeChild(div.firstChild);
			}

// Clear slider area
			var div = document.getElementById("sliderContainer");
 			while(div.firstChild) {
			     div.removeChild(div.firstChild);
			}

// Get selected option
		var e = document.getElementById("dbList");
		var value = e.options[e.selectedIndex].value;
		var text = e.options[e.selectedIndex].text;

// Parse the json
		var datasettoLoad = [];
		var datasetNamestoLoad = [];
		for (i=0; i<actual_JSON.length; i++)
			{
			     if (i == parseInt(value))
					      {
						        for (j=0; j<actual_JSON[i].datasets.length; j++)
						              {
							                     datasettoLoad.push( actual_JSON[i].datasets[j].location );
							                            datasetNamestoLoad.push( actual_JSON[i].datasets[j].name );
						               }
					       }
			}

		var dataSets = datasettoLoad;
		// START: add code to manage databases to view
		// END:   add code to manage databases to view

		var dataResults = null;
		var dataValues = null;
		var query = {};
		var images = [];
		var numImages = 0;

		var q = d3.queue();
		dataSets.forEach(function(item, index)
      {
			     q.defer(d3.csv, item + "/data.csv");
			});

		q.awaitAll(function(error, results) {
		    var values = {};
				results.forEach(function(item, index) {
					var keys = Object.keys(item[0]).filter(function(d) {
						return !isNaN(+item[0][d]);
					});

				var lookup = {};

				item.forEach(function(result, index) {
				      keys.forEach(function(key, index) {
							if (!(key in values)) {
								values[key] = [];
							}

							values[key].push(result[key]);
					    });

					lookup[getLookupKey(keys, result)] = result;
					})

					results[index] = {keys: keys, results: results[index], lookup: lookup};
				});

				var keys = Object.keys(values);
				keys.forEach(function(key, index) {
					values[key] = values[key].filter(onlyUnique);
					values[key] = values[key].sort(function(a, b){return (+a)-(+b)});
				});

				doneLoading(results, values);
			});

function updateResults()
		{
// Called when sliders are moved
		  dataResults.forEach(function(result, index) {
					var imgSrcKey = getLookupKey(result.keys, query);
					if (imgSrcKey in result.lookup) {
							var imgSrc = dataSets[index] + "/" +result.lookup[imgSrcKey]["FILE"];
							images[index].img.attr("src", imgSrc);
						}
						else {
							images[index].img.attr("src", "cinema/view/1.2/images/empty.png");
						}
					});
			}

function doneLoading(results, values)
		{
			var imageSizeSlider = d3.select("#imageSize")
					.property("value", (100/dataSets.length)-1)
					.on("input", function() {
						for (i = 0; i < numImages; i++) {
							var selectedItem = "#image_div_" + i.toString();
							d3.select(selectedItem).style("width","" + imageSizeSlider.node().value + "%")
						      }
				     });

			dataResults = results;
			dataValues = values;

			var keys = Object.keys(values);
			keys.forEach(function(key, index) {
					var sliderDiv = d3.select("#sliderContainer").append("div");
					sliderDiv.append("div")
						.html(key)
						.style("padding", "5px");
					var slider = sliderDiv.append("div")
							.append("input")
							.attr("type","range")
							.attr("class","slidecontainer")
							.attr("min", "0")
							.attr("max", values[key].length - 1)
							.property("value", "0")
							.style("float", "left");
					var sliderText = sliderDiv.append("input")
							.attr("type","text")
							.attr("value", values[key][0])
							.style("width", "40px")
							.on("input", function() {
							    query[key] = this.value;
									var index = values[key].indexOf(this.value);
									slider.property("value", index);
									updateResults();
								});

					slider.on("input", function() {
							var val = values[key][+this.value];
							sliderText.property("value", val);
							query[key] = val;
								updateResults();
						});

					query[key] = values[key][0];
				});


			dataResults.forEach(function(result, index) {
				console.log("index:", index);
				console.log("val:",imageSizeSlider.node().value);
				numImages = numImages + 1
				var imgSrcKey = getLookupKey(result.keys, query);

				var img = d3.select("#imageArea")
					  .append("div")
						.attr("id", "image_div_" + index.toString())
						.style("width","" + imageSizeSlider.node().value + "%")
						.style("text-align","center")
						.text(datasetNamestoLoad[index])

						.append("img")
						.attr("class", "cinemaImage")
						.attr("src", "cinema/view/images/empty.png")
						.style("width","100%")

						.on("load", function() {
								if (this.src != "cinema/view/images/empty.png") {
										images[index].height = this.height;
								}
							})
						.on("error", function() {
								this.src='cinema/view/images/empty.png';
								this.height = images[index].height;
							});

					images.push({img: img});

					if (imgSrcKey in result.lookup) {
						var imgSrc = dataSets[index] + "/" + result.lookup[imgSrcKey]["FILE"];
						images[index].img.attr("src", imgSrc);
					}
					else {
						images[index].img.attr("src", "cinema/view/images/empty.png");
					}
				});
			}
		}
