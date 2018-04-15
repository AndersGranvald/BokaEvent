// BokaEventServer.js
// Boka IBK Event
//


// BASE SETUP
// ==============================================
var express = require('express'); 
var bodyParser = require('body-parser')
var redis = require ('redis');

var app = express();  
var redisClient = redis.createClient ();

app.use(express.static('img'));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));


// Variables for this server
//================================================
var antalCalls = 0;					// Antal anrop till servern
var logRecs = [];					// Array of log records
var games = [];						// Array of game info
var sendMail = false;				// Bool send mail on/off


// Support functions used in this server
//================================================

// constructor for new reservation
function Reservation (coName, contact, phone, numPersons, transDate, status) {
  this.coName = coName;
  this.contact = contact;
  this.phone = phone;
  this.numPersons = numPersons;
  this.transactionDate = transDate;
  this.status = status;
}

// constructor for reservation 
function reservation (firstName, surName, company, email, comment) {
  this.timeStamp = new Date();
  this.firstName = firstName;
  this.surName = surName;
  this.company = company;
  this.email = email;
  this.comment = comment;
}

// 
function nameAndPhone (str) {
  var phone = "";
  var contact = "";
  
  var startPos = str.indexOf ("0");
  
  if (startPos > 0) {
    phone = str.substring (startPos, str.length);
    contact = str.substring (0, startPos - 1);
  } else {
    contact = str;
  }
  
  return (contact + ';' + phone);
}

// 
//
function init () {

} // init




// Start
//================================================

init();



// Middleware för att logga alla inkommande calls
//================================================

var myLogger = function (req, res, next) {
  var logRec = "";
  var d = new Date();
  antalCalls++;
  logRec = antalCalls + ", " + d + ", " + req._parsedUrl.pathname + ", ";
//  console.log(logRec);
  logRecs.push(logRec);
//  console.log('LOGGED req:', req._parsedUrl.pathname);
  next();
};

app.use(myLogger);



// CORS
//
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});


// Funktioner for att hantera dataaccess i REDIS
//================================================

redisClient.on('connect', function() {
    console.log('Server connected to Redis');
});

function appendReservationToKey (key, reservation) {
  redisClient.append (key, reservation, function(err, reply) {
    console.log(reply);
  });  
}



// API
//================================================

// Get
//--------------------
app.get('/', function(req, res){
  res.sendfile("index.html");  
});


app.get('/api/status', function(req, res){
  res.sendfile ("status.html");
});


app.get('/api/status-content', function(req, res){
  var html = "";
  //console.log ("In /status-content " + req.body);
  redisClient.get ("IBKEvent-20180505-Bokningar", function(err, reply) {
    reply = reply.replace(/,\s*$/, "");  // remove trailing comma
    var responseStr = "[" + reply + "]";  
    //console.log(reply);
    res.end (responseStr);
  });   
  
});



// Post
//--------------------


// Genomför bokning av plats
//
app.post('/api/reservations', function(req, res){

  var transDateTime = new (Date); 
//  console.log("In POST /api/reservations" + transDateTime);
   
  var retval = nameAndPhone (req.body.Namn);
  contact = retval.substring (0, retval.indexOf(';'));
  phone = retval.substring (retval.indexOf(';') + 1, retval.length);
 
  var reservation = new Reservation (req.body.Ftg, contact, phone, req.body.Antal, transDateTime, "Active");
   
  var strToAppend = JSON.stringify(reservation) + ", ";
  console.log ('Ny transaktion: ' + strToAppend); 
  appendReservationToKey ("IBKEvent-20180505-Bokningar", strToAppend);
  
  var retval="OK";
  
  res.end (retval);
}); // /api/reservations


app.post('/startMail', function(req, res){
 // console.log("In POST /startMail");
  sendMail = true;
  res.end ("OK");
});  // /startMail

app.post('/stopMail', function(req, res){
//  console.log("In POST /stopMail");
  sendMail = false;
  res.end ("OK");
});  // /stopMail




// Start server
// bortkommenterat pga socket.io

app.listen(3000, function(){
  console.log('listening on *:3000');
});
