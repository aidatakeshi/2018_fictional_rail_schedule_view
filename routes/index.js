var express = require('express');
var router = express.Router();

/**
 * APIs
 */

router.get('/api/', function(req, res, next){
	res.render('api.ejs', {req: req});
});

var list_controller = require('../controllers/list_controller');
router.get('/api/lines_stations/', list_controller.api_lines_stations);
router.get('/api/stations/:line/', list_controller.api_stations);
router.get('/api/stations/', list_controller.api_stations_all);
router.get('/api/lines/', list_controller.api_lines_only);

var station_timetable_controller = require('../controllers/station_timetable_controller');
router.get('/api/timetable/station/:station/:line/:direction/', station_timetable_controller.api_timetable_1);
router.get('/api/timetable/station/:station/:line/:direction/:dayType', station_timetable_controller.api_timetable_2);

var line_timetable_controller = require('../controllers/line_timetable_controller');
router.get('/api/timetable/line/:line/:direction/:hour', line_timetable_controller.api_timetable_1);
router.get('/api/timetable/line/:line/:direction/:dayType/:hour', line_timetable_controller.api_timetable_2);

var trip_timetable_controller = require('../controllers/trip_timetable_controller');
router.get('/api/timetable/trip/:trip/:dayType/', trip_timetable_controller.api_timetable);
router.get('/api/timetable/trips/:trips/:dayType/', trip_timetable_controller.api_timetable_multi);

var trip_planner_controller = require('../controllers/trip_planner_controller');
router.get('/api/trip-planner/:dayType/:from/:to/:TPType/:h/:m/', trip_planner_controller.api_trip_planner);
router.get('/api/trip-planner/:dayType/:from/:to/:TPType/', trip_planner_controller.api_trip_planner);
router.get('/api/last-train/:dayType/:station/', trip_planner_controller.api_last_train);

var run_no_controller = require('../controllers/run_no_controller');
router.get('/api/run-no/list/', run_no_controller.api_run_no_list_1);
router.get('/api/run-no/list/:dayType/', run_no_controller.api_run_no_list_2);
router.get('/api/run-no/run/:dayType/:runNo1/:runNo2/', run_no_controller.api_run_no_pair);

/**
 * Main Page
 */

router.get('/', function(req, res, next) { res.redirect("/s/") });
router.get('/s/', function(req, res, next) { res.render('index', {req: req}); });

/**
 * Timetable
 */

router.get('/timetable/', list_controller.timetable_station.bind({template: "timetable_home"}));
router.get('/timetable/station/:station/', list_controller.timetable_station.bind({template: "timetable_station"}));
router.get('/timetable/station/:station/:line/:direction/:dayType', station_timetable_controller.timetable_station_details);
router.get('/timetable/trip/:trips/:dayType', trip_timetable_controller.trip_details);

router.get('/timetable/line/:line/:direction/:dayType', line_timetable_controller.timetable_line);
router.get('/timetable/line/:line/:direction/:dayType/:hour', line_timetable_controller.timetable_line);

//pdf
router.get('/pdf/Timetable-:station-:line-:direction.pdf', station_timetable_controller.timetable_station_pdf);

/**
 * Trip Planner
 */

router.get('/trip-planner/', list_controller.trip_planner_station.bind({template: "trip_planner_main"}));
router.get('/trip-planner/:dayType/:from/:to/:fareType/:TPType/:h/:m/', trip_planner_controller.trip_planner_results);
router.get('/trip-planner/:dayType/:from/:to/:fareType/:TPType/', trip_planner_controller.trip_planner_results);

/**
 * Last Train
 */

router.get('/last-train/', list_controller.trip_planner_station.bind({template: "last_train_main"}));
router.get('/last-train/:dayType/:station', trip_planner_controller.last_train_results);

/**
 * Fare
 */

router.get('/fare/', function(req, res, next){
	res.render('fare.ejs', {req: req, fares: global.fares});
});

/**
 * Run Numbers
 */

router.get('/run-no/', function(req, res, next){
	res.redirect('/run-no/WK/');
});

router.get('/run-no/:dayType/', run_no_controller.run_no_list);
router.get('/run-no/:dayType/:runNo/', run_no_controller.run_no_redirect);
router.get('/run-no/:dayType/:runNo1/:runNo2/', run_no_controller.run_no_detail);

/**
 * Exports
 */

module.exports = router;
