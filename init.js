/**
 * System Initiation
 */

/**
 * 	global.consistTypes
 * 	global.lines
 * 	global.stations
 * 	global.trainTypes
 * 	global.trips.WK
 * 	global.trips.PH
 * 	global.planner
 * 	global.fares
*/

//Includes
var MongoClient = require('mongodb').MongoClient;
var cron = require('node-cron');

//MongoDB connection information
var mo = require("./mongodb_conn.js");

//Start MongoDB Connection
var url = "mongodb://"+mo.$.user+":"+mo.$.password+"@"+mo.$.url+":"+mo.$.port+"/"+mo.$.db;
MongoClient.connect(url, {useNewUrlParser: true}, function(err, mydb) {
	global.db = mydb;
	console.log("DB connected");
	initData();
});

//Init Data

var counter;
global.dataAvailable = false;

var initData = function(){
	initCaches();
	global.consistTypes = {};
	global.lines = {};
	global.stations = {};
	global.trainTypes = {};
	global.trips = {
		WK: {},
		PH: {},
	};
	counter = 9;
	db.collection("consist_types").find({}).toArray(consistTypesFound);
	db.collection("lines").find({}).toArray(linesFound);
	db.collection("stations").find({}).sort({id: +1}).toArray(stationsFound);
	db.collection("train_types").find({}).toArray(trainTypesFound);
	db.collection("trips_wk").find({}).toArray(tripsFound.bind({dayType: "WK"}));
	db.collection("trips_ph").find({}).toArray(tripsFound.bind({dayType: "PH"}));
	db.collection("planner").find({}).toArray(plannerFound);
	db.collection("timetable_pdf").find({}).toArray(timetablePDFFound);
	db.collection("fares").find({}).toArray(faresFound);
};

var consistTypesFound = function(err, result){
	if (err) throw err;
	//Process
	global.consistTypes = {};
	for (var i in result){
		global.consistTypes[result[i].id] = result[i];
	}
	//Done
	counter--;
	console.log("Consist Types Data Prepared" + " (" + result.length + " entries)");
	if (counter <= 0) allDataPrepared();
};

var linesFound = function(err, result){
	if (err) throw err;
	//Process
	global.lines = {};
	for (var i in result){
		global.lines[result[i].id] = result[i];
	}
	//Done
	counter--;
	console.log("Lines Data Prepared" + " (" + result.length + " entries)");
	if (counter <= 0) allDataPrepared();
};

var stationsFound = function(err, result){
	if (err) throw err;
	//Process
	global.stations = {};
	for (var i in result){
		global.stations[result[i].id] = result[i];
	}
	//Done
	counter--;
	console.log("Stations Data Prepared" + " (" + result.length + " entries)");
	if (counter <= 0) allDataPrepared();
};

var trainTypesFound = function(err, result){
	if (err) throw err;
	global.trainTypes = {};
	//Process
	for (var i in result){
		global.trainTypes[result[i].id] = result[i];
	}
	//Done
	counter--;
	console.log("Train Types Data Prepared" + " (" + result.length + " entries)");
	if (counter <= 0) allDataPrepared();
};

var tripsFound = function(err, result){
	var dt = this.dayType;
	if (err) throw err;
	global.trips[dt] = {};
	//Process
	for (var i in result){
		if (global.trips[dt][result[i].tripNo] != null)
		console.log(["Overlapped trip no.s", result[i].tripNo, result[i].trainType, global.trips[dt][result[i].tripNo].trainType]); //###
		global.trips[dt][result[i].tripNo] = result[i];
	}
	//Done
	counter--;
	console.log("Trips Data (" + dt + ") Prepared" + " (" + result.length + " entries)");
	if (counter <= 0) allDataPrepared();
};

var plannerFound = function(err, result){
	if (err) throw err;
	global.planner = result[0];
	//Done
	counter--;
	console.log("Planner Data Prepared");
	if (counter <= 0) allDataPrepared();
};

var faresFound = function(err, result){
	if (err) throw err;
	global.fares = result[0];
	//Done
	counter--;
	console.log("Fares Data Prepared");
	if (counter <= 0) allDataPrepared();
};

var timetablePDFFound = function(err, result){
	if (err) throw err;
	global.timetablePDF = result[0];
	//Done
	counter--;
	console.log("Timetable PDF Data Prepared");
	if (counter <= 0) allDataPrepared();
};

var TP_indexing = require("./TripPlanner_indexing.js");
var RunNoSearch = require("./RunNoSearch.js");

var allDataPrepared = function(){
	global.dataAvailable = true;
	console.log("All Data Loaded.");
	TP_indexing.init();
	RunNoSearch.init();
}

var initCaches = function(){
	global.cache = {
		trip_planner: {},
		trip_planner_quota: 1000,
	};
}

//Set schedule
cron.schedule("0 0 3 * * *", initData);
