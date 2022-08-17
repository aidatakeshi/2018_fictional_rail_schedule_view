var fs = require('fs');
var path = require('path');
var myPath = (str) => {
    return path.resolve("pdf/" + str).replace("root/", "root/mk_timetable/");
};

//Page Size: A2
exports.pageSetup = {
    bufferPages: true,
    size: [1190, 1684],
    margin: 0,
};

//Fonts
exports.registerFonts = function(doc){
    doc.registerFont('AvenirBook', myPath("fonts/AvenirLTStd-Book.otf"));
    doc.registerFont('DINProM', myPath("fonts/DINPro-Medium.ttf"));
    doc.registerFont('DINProL', myPath("fonts/DINPro-Light.ttf"));
    doc.registerFont('UME4', myPath("fonts/UME4.ttf"));
    doc.registerFont('UME5', myPath("fonts/UME5.ttf"));
}

//SVGs
exports.svgs = {
    "cars-2": fs.readFileSync(myPath("icons/cars-2.svg"), "utf8"),
    "cars-4": fs.readFileSync(myPath("icons/cars-4.svg"), "utf8"),
    "cars-6": fs.readFileSync(myPath("icons/cars-6.svg"), "utf8"),
    "cars-8": fs.readFileSync(myPath("icons/cars-8.svg"), "utf8"),
    "cars-12": fs.readFileSync(myPath("icons/cars-12.svg"), "utf8"),
    "cars-16": fs.readFileSync(myPath("icons/cars-16.svg"), "utf8"),
    "track-0": fs.readFileSync(myPath("icons/track-0.svg"), "utf8"),
    "track-1": fs.readFileSync(myPath("icons/track-1.svg"), "utf8"),
    "track-2": fs.readFileSync(myPath("icons/track-2.svg"), "utf8"),
    "track-3": fs.readFileSync(myPath("icons/track-3.svg"), "utf8"),
    "track-4": fs.readFileSync(myPath("icons/track-4.svg"), "utf8"),
    "track-5": fs.readFileSync(myPath("icons/track-5.svg"), "utf8"),
    "track-6": fs.readFileSync(myPath("icons/track-6.svg"), "utf8"),
    "track-7": fs.readFileSync(myPath("icons/track-7.svg"), "utf8"),
    "track-8": fs.readFileSync(myPath("icons/track-8.svg"), "utf8"),
    "track-9": fs.readFileSync(myPath("icons/track-9.svg"), "utf8"),
    "track-10": fs.readFileSync(myPath("icons/track-10.svg"), "utf8"),
    "track-11": fs.readFileSync(myPath("icons/track-11.svg"), "utf8"),
    "track-12": fs.readFileSync(myPath("icons/track-12.svg"), "utf8"),
    "track-13": fs.readFileSync(myPath("icons/track-13.svg"), "utf8"),
    "track-14": fs.readFileSync(myPath("icons/track-14.svg"), "utf8"),
    "track-15": fs.readFileSync(myPath("icons/track-15.svg"), "utf8"),
    "track-16": fs.readFileSync(myPath("icons/track-16.svg"), "utf8"),
    "track-17": fs.readFileSync(myPath("icons/track-17.svg"), "utf8"),
    "track-18": fs.readFileSync(myPath("icons/track-18.svg"), "utf8"),
    "beginning": fs.readFileSync(myPath("icons/beginning.svg"), "utf8"),
    "reserved": fs.readFileSync(myPath("icons/reserved.svg"), "utf8"),
    "liner": fs.readFileSync(myPath("icons/liner.svg"), "utf8"),
    "legend": fs.readFileSync(myPath("icons/legend.svg"), "utf8"),
    "reserved-guide": fs.readFileSync(myPath("icons/reserved-guide.svg"), "utf8"),
};

//Header Settings
exports.header = {
    x: 0, y: 0, width: 1190, height: 97, bg: "#333333",
    jp: {y: 8, size: 50, font: "UME5", color: "white", text: "{1}駅 - 時刻表"},
    en: {y: 58, size: 25, font: "DINProM", color: "white", text: "{1} Station - Timetable"},
};

//Subheader Settings
exports.subheader = {
    x: 0, y: 100, width: 1190, height: 77, 
    jp: {y: 108, size: 36, font: "UME5", color: "white", text: "{1}・{2}方面"},
    en: {y: 148, size: 18, font: "DINProM", color: "white", text: "{1} | For {2}"},
};

//Schedule Change
exports.sch_change = {
    jp: {x: 1180, y: 145, size: 12, font: "UME4", color: "white"},
    en: {x: 1180, y: 160, size: 10, font: "DINProL", color: "white"},
},

//Layout Settings
exports.default2_max_tph = {WK: 15, PH: 15};

//Timetable Settings
exports.timetable = {
    width: 1190,
    title: {
        WK: {
            y: 195, x_shift: 96, y_shift: 15,
            bg: "#3366cc", bg2: "#3c7de5", color: "white",
            jp: {font: "UME5", color: "white", text: "平日", size: 48},
            en: {font: "DINProM", color: "white", text: " Weekdays", size: 24},
        },
        PH: {
            y: 195, x_shift: 144, y_shift: 15,
            bg: "#cc3333", bg2: "#e53c3c", color: "white",
            jp: {font: "UME5", color: "white", text: "土休日", size: 48},
            en: {font: "DINProM", color: "white", text: " Saturdays & Holidays", size: 24},
        },
    },
    subtitle: {
        color: "white",
        jp: {y: 196, font: "UME5", color: "white", size: 30},
        en: {y: 228, font: "DINProM", color: "white", size: 15},
    },
    outer_box: {y: 180, height: 1290, rows: 22},
    inner_box: {y: 260, height: 1210, bg: "white", margin_left: 60, margin_right: 10},
    compact: {TPH_max_total: 30, TPH_max_1: 24, TPH_max_2: 15},
};

//Timetable Item Settings
exports.timetableItem = {
    width: 31, max_spacing: 55, height: 55, bg_even: "#eee", bg_odd: "white",
    title: {x_shift: 0, y_shift: 10, font: "AvenirBook", size: 40, color: "white"},
    minutes: {y_shift: 13, font: "AvenirBook", size: 24},
    type1: {x_shift: 0.5, y_shift: 10, width: 30, height: 35},
    type2: {x_shift: 0.5, y_shift: 10, width: 30, height: 35, box_x_shift: 1.5, box_y_shift: 11, box_width: 28, box_height: 24, box_color: "white"},
    dest_j: {y_shift: 1.5, size: 7, color: "black", font: "UME4"},
    dest_e: {y_shift: 45, size: 7, color: "black", font: "DINProL", margin: 0},
    track: {x_shift: 2, y_shift: 36, size: 8},
    beginning: {x_shift: 11.5, y_shift: 36, size: 8},
    noOfCars: {x_shift: 21.5, y_shift: 36, size: 8},
    reserved: {x_shift: 0.5, y_shift: 44, size: 12},
};

//Remarks Settings
exports.remarks = {
    bg: {x: 0, y: 1470, width: 1190, height: 214, bg: "#666666"},
    box: {y: 1480, height: 194, margin: 2, bg: "#222"},
    title_jp: {y_shift: 3, size: 15, font: "UME5", color: "white"},
    title_en: {y_shift: 18, size: 10, font: "DINProM", color: "white"},
    body: {bg: "white", y: 1512, height: 160, y2: 1492, height2: 180},
    initial_x: 60,
    x_spacing: 3,
    legend: {
        width: 200, height: 160, title: "時刻表の見方", title_en: "How to Read the Timetable",
        contents: [
            {text: "行先", font: "UME4", size: 10, align: "left", color: "#333", x: 136, y: 3},
            {text: "Destination", font: "DINProL", size: 7, align: "left", color: "#333", x: 136, y: 13},
            {text: "発車時刻", font: "UME4", size: 10, align: "left", color: "#333", x: 136, y: 33},
            {text: "Departure Time", font: "DINProL", size: 7, align: "left", color: "#333", x: 136, y: 43},
            {text: "両数", font: "UME4", size: 10, align: "left", color: "#333", x: 136, y: 63},
            {text: "No. of Cars", font: "DINProL", size: 7, align: "left", color: "#333", x: 136, y: 73},
            {text: "行先のコード", font: "UME4", size: 10, align: "left", color: "#333", x: 136, y: 93},
            {text: "Destination Code", font: "DINProL", size: 7, align: "left", color: "#333", x: 136, y: 103},
            {text: "のりば", font: "UME4", size: 10, align: "right", color: "#333", x: 44, y: 63},
            {text: "Track", font: "DINProL", size: 7, align: "right", color: "#333", x: 44, y: 73},
            {text: "当駅始発", font: "UME4", size: 10, align: "right", color: "#333", x: 44, y: 93},
            {text: "Begins Here", font: "DINProL", size: 7, align: "right", color: "#333", x: 44, y: 103},
            {text: "一部特別車（指定席）", font: "UME4", size: 10, align: "left", color: "#333", x: 65, y: 119},
            {text: "Some cars with reserved seats", font: "DINProL", size: 7, align: "left", color: "#333", x: 64, y: 128},
            {text: "全車特別車（指定席）", font: "UME4", size: 10, align: "left", color: "#333", x: 65, y: 139},
            {text: "ALL cars with reserved seats", font: "DINProL", size: 7, align: "left", color: "#333", x: 64, y: 148},
        ],
    },
    trainTypes: {
        width: 130, item_height: 20, title: "列車種別", title_en: "Train Service Types",
        liner_suffix: {jp: "", en: ""},
        reserved_suffix: {jp: "（一部指定）", en: ""},
        type1: {x_shift: 1, y_shift: 1, width: 18, height: 18},
        type2: {x_shift: 1, y_shift: 1, width: 18, height: 18, box_x_shift: 2, box_y_shift: 2, box_width: 16, box_height: 11, box_color: "white"},
        minutes: {x_shift: 0, width: 20, y_shift: 2.5, font: "AvenirBook", size: 12},
        jp: {x_shift: 22, y_shift: 1, font: "UME4", color: "black", size: 10},
        en: {x_shift: 22, y_shift: 9, font: "DINProL", color: "black", size: 8},
    },
    dests: {
        width: 120, item_height: 16, title: "行先", title_en: "Destinations",
        box: {x_shift: 2, y_shift: 2, width: 26, height: 12, bg: "#eee"},
        code: {x_shift: 0, width: 30, y_shift: 1, font: "DINProL", color: "black", size: 10},
        jp: {x_shift: 32, y_shift: 0.5, font: "UME4", color: "black", size: 8},
        en: {x_shift: 32, y_shift: 6.5, font: "DINProL", color: "black", size: 8},
    },
    reservedGuide: {
        width: 300, height: 160, title: "特別車（指定席）ご案内", title_en: "Special Cars (Reserved Seats)",
        contents: [
            {text: "一部特別車", font: "UME5", size: 10, align: "left", color: "white", x: 12, y: 3},
            {text: "Partially Special Cars", font: "DINProM", size: 10, align: "right", color: "white", x: 288, y: 1},
            {text: "全車特別車（ライナー）", font: "UME5", size: 10, align: "left", color: "white", x: 12, y: 91},
            {text: "All Special Cars (Liner)", font: "DINProM", size: 10, align: "right", color: "white", x: 288, y: 89},
            {text: "河田と小西市間の併結運転", font: "UME4", size: 7, align: "left", color: "black", x: 20, y: 77.5},
            {text: "Coupled operation between Kawada and Konishi-shi", font: "DINProL", size: 7, align: "right", color: "black", x: 280, y: 76},
            {text: "指定席券が必要ます。", font: "UME5", size: 10, align: "left", color: "black", x: 20, y: 143},
            {text: "Reserved-seat ticket is required.", font: "DINProM", size: 10, align: "right", color: "black", x: 280, y: 141},
        ],
    },
}