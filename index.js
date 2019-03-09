var http = require("http");
var https = require("https");

var url = require("url");
var StringDecoder = require("string_decoder").StringDecoder;
var config = require("./lib/config");
var fs = require("fs");
var handlers = require('./lib/handlers')
var helpers = require('./lib/helpers')

//Instantiate the HTTP server
var httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () => {
  console.log("The HTTP server is up and running on port " + config.httpPort);
});

var httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem")
};

//Instantiate the HTTPS Sserver
var httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
  console.log("The HTTPS server is up and running on port " + config.httpsPort);
});

//All the server logic for both http and https createServer
var unifiedServer = function(req, res) {
  //Get url and parse it
  var parsedUrl = url.parse(req.url, true);

  //Get path from url;
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, "");

  //Get the HTTP method
  var method = req.method.toLowerCase();

  //Get the query string as an object
  var queryStringObject = parsedUrl.query;

  //Get the headers as an object
  var headers = req.headers;

  //Get the payload, if any
  var decoder = new StringDecoder("utf-8");
  var buffer = "";

  req.on("data", data => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    //Choose the handler this request should go to. If one is not exist
    var chosenhandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    //Construct data object to send to the handler
    var data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler specified in the router
    chosenhandler(data, (statusCode, payload) => {
      //Use the status code called back by the handler, or default
      statusCode = typeof statusCode == "number" ? statusCode : 200;

      //Use the payload called back by the handler, or default to an empty object
      payload = typeof payload == "object" ? payload : {};

      //Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      //Set header - JSON
      res.setHeader("Content-Type", "appliaction/json");

      //Return the response
      res.writeHead(statusCode);
      res.end(payloadString);

      //Log the request path
      console.log("Returning this response :", statusCode, payloadString);
    });
  });
};


//Define a request router
var router = {
  'ping': handlers.ping,
  'users': handlers.users
};
