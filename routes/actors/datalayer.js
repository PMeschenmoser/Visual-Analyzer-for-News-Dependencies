/**
 * Author: P. Meschenmoser
 * This actor handles requests for server-sided article import
 *
 */
var path = require('path');
var processor = require(path.resolve( __dirname, "./processor.js" ) ); //for complementing data

module.exports = {
    getServerOverview: function(req, cb) {
        //this call is used to serve data for the frontend's data table
        var d = req.app.get('docs'); // not null, as routing initialised after files read
        cb(null,d.overview); // d.overview is an array of objects with keys for section, topic, etc...
        //always callback to central.js
    },

    importFromServer: function(req,cb){
        //this call serves the actual files to the frontend
        //catch empty request parameters:
        if (!req.body.hasOwnProperty('pairs') || !req.body.hasOwnProperty('metric') ){
            cb('Invalid JSON parameters', []);
            return;
        }
        var d = req.app.get('docs').docs;

        var res = {body:{docs: [], metric: req.body.metric}}; //simulate a common AJAX request to actors/datalayer
        req.body.pairs.forEach(function(p){ //gather all the documents having these p.section's and p.topic's
            if (d.hasOwnProperty(p.section+'_'+p.topic)) res.body.docs = res.body.docs.concat(d[p.section+'_'+p.topic]);
        });
        //sort documents by date:
        res.body.docs.sort(function(a,b){return a.date - b.date;});

        //request link data and apply color:
        processor.run(res, function(e,results){
            //results has the properties colored (={docID: [r, g, b, a]}) and links (triangular matrix, c.f. metric.js)
            //add d.background property to the server documents
            results.colored.forEach(function(colored){res.body.docs[colored.index].background = colored.values;});
            cb(e, {docs:res.body.docs, links:results.links, matches: results.matches}); //return to central.js
        });
    }
};