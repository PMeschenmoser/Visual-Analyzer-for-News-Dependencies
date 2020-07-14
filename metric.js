/**
 * Author: P. Meschenmoser
 * This module is used to compute similarity matrices (wrt. cosine or jaccard) for a set of documents.
 * It is called by actors/processor.js
 *
 *
 * docs is an array of objects.
 * The actual text is referenced by (e.g.) docs[0].content.
 */

var natural = require('natural');
var jacc = require('jaccard');
var extend = require('util')._extend;
var childProcess = require('child_process')
var fs = require('fs')

var exportTmpFiles = function (content1, content2) {
    var basePath = 'pdbins/tmpdata/';
    try {
        fs.writeFileSync(basePath + 'content1.txt', content1);
        fs.writeFileSync(basePath + 'content2.txt', content2);
    } catch(err) {
        console.log(err.message);
    }
}

module.exports = {
    cosine: function (docs) {
        /*
            This function computes the tf-idf/cosine similarity score for a set of docs.
            Basically, this is an implementation of the algorithm given in Manning's famous Web IR book.
         */
        var _dict = {};
        var matrix = {}; //triangular matrix, with docID's as keys
        var links = []; //return matrix as array. for better readability + modularity in vislayer.js
        var lengthDocs = [];

        /*
            Dictionary construction.
            _dict = {term1: {docID1: count11, docID2:  count12}, term2:...}

         */
        docs.forEach(function (doc, i) {
            console.log(doc);
            var terms = natural.PorterStemmer.tokenizeAndStem(doc.content); //Preprocess document
            lengthDocs.push(0);
            terms.forEach(function (term) {
                if (_dict.hasOwnProperty(term)) {
                    if (_dict[term].hasOwnProperty(i)) {
                        _dict[term][i]++; //the i-th document is already referenced by this term, increase term count
                    } else {
                        _dict[term][i] = 1; //first appearance of term in in the i-th document
                    }
                } else {
                    _dict[term] = {}; //first overall term appearance
                    _dict[term][i] = 1; //in the i-th document
                }
            });
        });

        var _dict_reduced = extend({}, _dict) //shallow copy
        for (var term in _dict) {
            //delete terms that are given only in a single document:
            if (Object.keys(_dict_reduced[term]).length <= 1) delete _dict_reduced[term];
            for (var doc in _dict_reduced[term]) {
                //log weighting of frequencies:
                _dict_reduced[term][doc] = 1 + Math.log10(_dict_reduced[term][doc]);
                lengthDocs[doc] += Math.pow(_dict_reduced[term][doc], 2); //used for length normalisation later
            }
        }

        //initiate the triangular matrix with 0 values:
        var sizeCollection = docs.length;
        for (var a = 0; a < sizeCollection - 1; a++) {
            matrix[a] = {};
            for (var b = a + 1; b < sizeCollection; b++) {
                matrix[a][b] = 0;
            }
        }


        for (var terms in _dict_reduced) {
            var tf = _dict_reduced[terms]; //object with (document-ID:tf)
            var docIDs = Object.keys(_dict_reduced[terms]);
            //var idf = Math.log10(sizeCollection/docIDs.length); not needed as same bag is used
            for (var i = 0; i < docIDs.length; i++) {
                for (var j = i + 1; j < docIDs.length; j++) {
                    //min/max cares for a proper ordering in the triangle matrix
                    //c.f. http://nlp.stanford.edu/IR-book/html/htmledition/computing-vector-scores-1.html
                    matrix[Math.min(docIDs[i], docIDs[j])][Math.max(docIDs[i], docIDs[j])] += tf[docIDs[i]] * tf[docIDs[j]];
                }
            }
        }

        //compute vector length:
        for (var i = 0; i < lengthDocs.length; i++) {
            lengthDocs[i] = Math.sqrt(lengthDocs[i])
        }
        //length normalisation:
        for (var row in matrix) {
            for (var col in matrix[row]) {
                matrix[row][col] /= lengthDocs[row] * lengthDocs[col];
            }
        }
        //transform data for vislayer.js
        for (var source in matrix) {
            for (var target in matrix[source]) {
                links.push({source: source, target: target, value: matrix[source][target]})
            }
        }
        return links; //  [{source: id, target:id, value: double},...], directly readable by vislayer
    },
    jaccard: function(docs){
        var sets = [];
        docs.forEach(function(doc) {
            var terms = natural.PorterStemmer.tokenizeAndStem(doc.content); //preprocessing
            var set = {};
            terms.forEach(function(term){ set[term] = true});
            sets.push(Object.keys(set)); //sets is an array of object dictionary
        });
        var links = [];
        //generate triangle 'matrix' and compute the actual jaccard score with the jacc lib
        for (var i=0; i<Math.ceil(sets.length/2); i++){
            for (var j=i+1;j<sets.length;j++){
                links.push({source:i, target:j, value: jacc.index(sets[i], sets[j])})
            }
        }
        return links; //  [{source: id, target:id, value: double},...], directly readable by vislayer
    },
    sherlock: function(docs){

        var texts = [];
        docs.forEach(function(doc) {
            texts.push(doc.content);
        });

        var sherlockSimilarity = function(content1, content2){
            exportTmpFiles(content1, content2);
            var fileBasePath = process.cwd() + '/pdbins/tmpdata/';
            var cmd = process.cwd() + '/pdbins/sherlock -t 0% ' + fileBasePath + 'content1.txt ' + fileBasePath + 'content2.txt';
            console.log(cmd);
            var resultLine = childProcess.execSync(cmd, {'cwd': process.cwd(), 'encoding': 'utf8'});
            console.log(resultLine);
            var tmpValues = resultLine.split(' ');
            var similarityValue =  tmpValues[tmpValues.length-1];
            similarityValue = similarityValue.substr(0, similarityValue.length-1);
            similarityValue = parseFloat(similarityValue) / 100.0;
            console.log(similarityValue);
            return similarityValue;
        };

        var links = [];
        //generate triangle 'matrix' and compute the actual sherlock score with the sherlock executable
        for (var i=0; i<Math.ceil(texts.length/2); i++){
            for (var j=i+1;j<texts.length;j++){
                links.push({source:i, target:j, value: sherlockSimilarity(texts[i], texts[j])})
            }
        }
        return links; //  [{source: id, target:id, value: double},...], directly readable by vislayer
    },
    jplag: function (docs) {
        var texts = [];
        docs.forEach(function (doc) {
            texts.push(doc.content);
        });
        console.log("texts",texts.length);
        var jplagSimilarity = function (content1, content2) {
            exportTmpFiles(content1, content2);
            var cmd = 'java -jar ' + process.cwd() + '/pdbins/jplag-2.11.9-SNAPSHOT-jar-with-dependencies.jar -l text -vq ' + process.cwd() + '/pdbins/tmpdata';
            //console.log(cmd);
            var resultLines = childProcess.execSync(cmd, {'cwd': process.cwd(), 'encoding': 'utf8'});
            resultLines = resultLines.split('\n');
            var resultLine = resultLines[resultLines.length - 2];
            console.log(resultLine);
            var tmpValues = resultLine.split(' ');
            var similarityValue = tmpValues[tmpValues.length - 1];
            similarityValue = parseFloat(similarityValue) / 100.0;
            console.log(similarityValue);
            return similarityValue;
        };

        var links = [];
        //generate triangle 'matrix' and compute the actual sherlock score with the sherlock executable
        for (var i = 0; i <= Math.ceil(texts.length / 2); i++) {
            for (var j = i + 1; j < texts.length; j++) {
                links.push({source: i, target: j, value: jplagSimilarity(texts[i], texts[j])})
            }
        }
        return links; //  [{source: id, target:id, value: double},...], directly readable by vislayer
    }
};

