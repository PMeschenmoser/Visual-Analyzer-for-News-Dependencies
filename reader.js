/**
 * Author: P. Meschenmoser
 * This module reads + parses server-sided article sets. Simultaneously, the folder overview is generated.
 * We are assuming well-formatted files over here, c.f. outputs of frontend datalayer.
 */

/*
    Define module dependencies
 */
var fs = require('fs');
var path = require('path');

var cache = {}; // {foldername : [parsedDoc1, parsedDoc2,], ...}
var overview = [];
var _requiredKeys = ['year', 'month', 'day', 'hour', 'min','source','title','content']; //for JSON files
var regex = /([0-9]{4})_([0-9]{2})_([0-9]{2})_([0-9]{2})([0-9]{2})_([^_]{3,})_(.{3,})/; //file name pattern for txt files

module.exports = {
    read: function(callback){ //to-do: proper error-handling
        var root = './data/';
        fs.readdir(root, function(err_dir,dirs) { //asynchronous
            //find all folders in './data/...
            var dirs = dirs.filter(function(dir){return fs.statSync(root+'/'+dir).isDirectory()});
            dirs.forEach(function(dir){
                cache[dir] = []; //no documents so far
                var src_lookup = {}; //used for counting unique sources
                //init overview for this folder:
                var overviewSingle = {section:dir.split('_')[0],topic:dir.split('_')[1], articles: 0, sources:0 };
                fs.readdir(root + '/' + dir, function(err_file, files){
                    //ignore non-(.txt|.json) files:
                    var tmp = files.filter(function(file){
                        var ext = path.extname(root+'/'+dir+'/'+file); //should be .json or .txt
                        return  ext === '.txt' || ext === '.json'
                    });
                        tmp.forEach(function(file){
                        var p = root+'/'+dir+'/'+file; //path to the current document
                        fs.readFile(p, 'utf8', function(err_files2, content){ //file reading
                            overviewSingle.articles++; //another article for this folder...
                            var doc = {};
                            if (path.extname(p) === '.json') { //JSON parsing:
                                doc = JSON.parse(content);
                                if (!doc.hasOwnProperty('content')) doc.content = doc.text;
                                if (!doc.hasOwnProperty('source')) doc.source = doc.sourceDomain;
                                // fallback parser for JSON files that do not contain the year, month, etc. fields (e.g., files coming directly from news-please)
                                if (doc.year === undefined) {
                                    // try parsing the 'publish_date' field
                                    var publishingDate = new Date(doc.publish_date);
                                    doc.year = publishingDate.getFullYear();
                                    doc.month = publishingDate.getMonth();
                                    doc.day = publishingDate.getDay();
                                    doc.hour = publishingDate.getHours();
                                    doc.min = publishingDate.getMinutes();
                                }
                            } else { //object construction for txt file
                                var match = regex.exec(file);
                                if (match) _requiredKeys.forEach(function(k,i){doc[k] = match[i+1];});
                                doc.content = content;
                            }
                            doc.filename = file;
                                if (!src_lookup.hasOwnProperty(doc.source)){ //count unique sources
                                    src_lookup[doc.source] = true;
                                    overviewSingle.sources++;
                                }
                                cache[dir].push(doc); //add current document to the cache
                                if (tmp.length === overviewSingle.articles){  //all documents in this folder are parsed
                                    overview.push(overviewSingle);
                                    //was this the last folder? use callback to get to main.js
                                    if (dirs.length === Object.keys(overview).length)callback({overview:overview,docs:cache});     //finished!
                                }
                        });
                    });
                });
            });
        })
    }
};