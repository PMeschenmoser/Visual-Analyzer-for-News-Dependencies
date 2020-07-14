/*
    Author: P. Meschenmoser
    This module works as a middle layer for routing. Any incoming route will arrive over here, and will be forwarded
    to the scripts (i.e. actors) in routes/actors.
 */
//define module dependencies
var express = require('express');
var router = express.Router();

//reference actors:
var actors = {};
['datalayer', 'processor'].forEach(function(file){actors[file]=require('./actors/'+file);});

/*
    Assume a POST call of localhost:3000/datalayer/getServerOverview.
    This call will be catched over here. 'datalayer' is the :actor,
    'getServerOverview' is the :f (function) accessed.
    Those values are accessible by req.params['actor'|'f']

 */
router.post('/:actor/:f', function (req, res, next) {
    if (!actors.hasOwnProperty(req.params.actor) || !actors[req.params.actor].hasOwnProperty(req.params.f)){
        //Invalid call parameters.
        //i.e. either the specified actor does not exist or the actor has no function f
        res.send({error:'Invalid AJAX parameters submitted.', rows:[]}); //back to frontend
        return;
    }

    //call the function :actor.:f and return an empty array, when query failed
    actors[req.params.actor][req.params.f](req, function(e,d){
        if (e) console.log(e.toString());
        res.send({error:e, data:d }); //back to front-end
        //done();
        return;
    });
});


module.exports = router;
