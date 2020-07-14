/**
 * Author: P. Meschenmoser
 *
 *
 * */

var nlp = require('compromise');
var corenlp = require('corenlp-request-wrapper');

//#java -mx1g -cp "*" edu.stanford.nlp.pipeline.StanfordCoreNLPServer
module.exports = {
    ner: function (docs) { //deprec
        var result = {type:'ner', docs:[]};
        docs.forEach(function(d,i){
            var thisdoc = {id:i, features: [] };
            thisdoc.features = thisdoc.features.concat(transformPeople(nlp(d.content).people()));
            thisdoc.features = thisdoc.features.concat(transformNER(nlp(d.content).places(), 'place'));
            thisdoc.features = thisdoc.features.concat(transformNER(nlp(d.content).organizations(), 'orga'));
            thisdoc.features.sort(function(a,b){
                return a.offset-b.offset;
            });
            result.docs.push(thisdoc);
        });
        return result;
    },
    pos: function(docs, callback){
        var supported = ['NN', 'NNS', 'VB', 'JJ', 'RB', 'CD']; //supported POS features
        var result = {type:'pos', docs:[]};
        var hrstart = process.hrtime(); //measure time
        var concat = "";
        var lengths = [];
        //pass the concatenation of all document content to the Stanford Core NLP server
        docs.forEach(function(d){
            concat += d.content;
            lengths.push(d.content.length);

        });
        corenlp.parse(
            concat,
            9000 ,
            "pos,lemma" /*annotators*/,
            "json" /*outputFormat*/,
            (err, parsedText) => { /*Callback function*/
                var i = 0;
                var offset = -1;
                var thisdoc = {id:i, features: [] };
                (JSON.parse(parsedText)).sentences.forEach(function(s){
                    s.tokens.forEach(function(t){
                        if (supported.indexOf(t.pos) > -1){ //focus only supported POS tokens
                            //sequently iterate through the tokens
                            if (t.characterOffsetBegin - offset> lengths[0]){ //we have to come to another document
                                result.docs.push(thisdoc);
                                i++;
                                thisdoc = {id:i, features: [] };
                                offset += +lengths.shift();
                            }
                            //make character offset relative to the current document, not to the whole concatenation
                            t.characterOffsetBegin =  t.characterOffsetBegin - offset-1;
                            t.characterOffsetEnd =  t.characterOffsetEnd - offset-1;
                            thisdoc.features.push(t);
                        }
                    });
                });
                result.docs.push(thisdoc);
                var hrend = process.hrtime(hrstart);
                console.info("Execution time (hr): %ds %dms", hrend[0], hrend[1]/1000000);
                callback([result]); //array to handle further feature types
            }
        );
    }
};


function transformPeople(people){ //deprec
    var res = [];
    people.data().forEach(function(p,i){
        res.push({type:'person' , text: p.text, normal: p.normal, gender:p.genderGuess, offset:people.out('offset')[i].offset});
    });
    return res;
}

function transformNER(n, type){ //deprec
    var data = n.data();
    data.forEach(function(d,i){
        data[i].offset = n.out('offset')[i].offset;
        data[i].type = type;
    });
    return data;
}
