/*
    Author: P. Meschenmoser
    This module is a central for appending/complementing a set of documents.
    I.e., we let the similarity compute and add d.background attributes to the data objects.
    It's either called directly from the front via /processor/run, when we want to have the similarity matrix
    for client-sided documents or when we want to recompute this matrix with a new metric.
    OR: to complement server-sided data, i.e.programmatically called by routes/actors/datalayer.js
 */

//define module dependencies
var path = require('path');
var metric = require(path.join(__dirname, '..', '..', 'metric.js'));
var colormap = require(path.join(__dirname, '..', '..', 'color.js'));
var featureex = require(path.join(__dirname, '..', '..', 'featureex.js'));
var segmentizer = require(path.join(__dirname, '..', '..', 'segmentizer.js'));

module.exports = {
    run: function (req, cb) {
        if (!req.body.hasOwnProperty('docs') || !req.body.hasOwnProperty('metric')){ //catch invalid parameters
            cb('Invalid AJAX Parameters submitted', null);
            return;
        }
        //get similarity matrix for req.body.docs
        var links = null;
        switch( req.body.metric){
            case 'cosine':
                links = metric.cosine(req.body.docs);
                break;
            case 'jaccard':
                links = metric.jaccard(req.body.docs);
                break;
            case 'sherlock':
                links = metric.sherlock(req.body.docs);
                break;
            case 'jplag':
                links = metric.jplag(req.body.docs);
                break;
        }

        var colored = colormap.apply(req.body.docs); //{docID: [r, g, b, a]}

        featureex.pos(req.body.docs, function(features){
            //callback, since we need to wait the response for Stanford Core NLP
            // return to datalayer or central
            cb(null, {links: links, colored:colored, matches: segmentizer.run(features, 0)});
        });

       // cb(null, {links: links, colored:colored}); // for VAND Graph

    },
    seg: function (req, cb) {
        if (!req.body.hasOwnProperty('docs') || !req.body.hasOwnProperty('refid')) { //catch invalid parameters
            cb('Invalid AJAX Parameters submitted', null);
            return;
        }
        featureex.pos(req.body.docs, function(features){
            cb(null, {matches: segmentizer.run(features, parseInt(req.body.refid))});
        });

    }
};