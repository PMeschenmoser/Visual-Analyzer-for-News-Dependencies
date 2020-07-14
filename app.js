/*
 * Author: P. Meschenmoser
 * This module configures node express properties and builds a base for routing.
 * In addition, the server-sided file reader gets called and server-sided error-handling is
  * defined.
 */
/*
    Module depencencies
 */

var express = require('express');
var path = require('path');
var compress = require('compression'); //compress data sent to the frontend
var cors = require('cors'); //avoid cross-reference exceptions
var logger = require('morgan');
var bodyParser = require('body-parser'); //used to read JSON-encoded AJAX parameters
var central  = require('./routes/central'); //routing central, c.f. central.js
var reader = require('./reader'); // server-sided article reader
var app = express();
/*
    configure express parameters:
 */
app.use(logger('dev'));
app.use(compress({level: 9}));
app.use(cors());
/*
    default size limit for submitted json was 100kb.
    such. an. evil. thing...
 */
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

/*
    Read all the articles placed at the backend.
    The only passed parameter to reader.read is the callback, that is called after all files are read.
    _____if you place new article files onto your server, you'll need to restart the server afterwards _____
 */

reader.read(function(docs) {
    //save documents in a 'global' app variable:
    app.set('docs', docs); //to be accessed by backend datalayer

    app.use(express.static(path.join(__dirname, 'public_multi'))); //where will we find .html files?
    app.use('/', central); //where are routes forwarded to?
    // catch 404 and forward to error handler:
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

// error handler
    app.use(function(err, req, res, next) {
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500); //return errror code
        //res.sendFile('error.html'); currently not used
    });
});


module.exports = app;




