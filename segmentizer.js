/**
 * Author: P. Meschenmoser
 *
 * */

var segID = 0;
module.exports = {
    run: function (features,refID) {
        var all = {};
        features.forEach(function(f){
            switch (f.type){
                case 'ner':
                    all.ner =_nerInner(f.docs, refID); //does not happen currently.
                    //I'd recommend to extend POS features by NER tags, which is easily doable with Stanford Core NLP
                    break;
                case 'pos':
                    all.pos = _getPOSMatches(f.docs,refID); //magic
                    break;
            }
        });
        return all;
    }
};



function _getPOSMatches(docs, refID){
    var refvector = _generateNGrams(docs[refID].features, refID);
    var docall = [];
    docs.forEach(function(doc,i) {
        if (i !== refID) {
            docall = docall.concat(_generateNGrams(docs[i].features, i));
        }
    });
    var final = [];
    refvector.forEach(function(r){ //for each n-gram of the main article
        var rset = new Set(r.normal);
        docall.forEach(function(d){ //for each n-gram of the reference articles
            var dset = new Set(d.normal);
            var intersection = new Set([...rset].filter(x => dset.has(x)));
            if (intersection.size > 1){ //do we have a match?
                //reduce matching features
                //i.e. (nonmatch, match , nonmatch, match, nonmatch) -> (match, nonmatch, match)
                var minindex_main = r.normal.length;
                var maxindex_main = 0;
                var minindex_doc = d.normal.length;
                var maxindex_doc = 0 ;
                var i1 = [];
                var i2 = [];
                [...intersection].forEach(function(a){
                    var tmp1= r.normal.indexOf(a);
                    var tmp2 = d.normal.indexOf(a);
                    i1.push(r.details[tmp1]);
                    i2.push(d.details[tmp2]);
                    if (tmp1 < minindex_main) minindex_main = tmp1;
                    if (tmp1 > maxindex_main ) maxindex_main = tmp1;
                    if (tmp2 < minindex_doc ) minindex_doc = tmp2;
                    if (tmp2 > maxindex_doc) maxindex_doc = tmp2;
                });
                var rnormal_sliced = r.normal.slice(minindex_main, maxindex_main+1);
                var dnormal_sliced = d.normal.slice(minindex_doc, maxindex_doc+1);

                if (dnormal_sliced.length > 1){
                    //compute order ratio:
                    i1.sort(function(a,b){
                        return a.characterOffsetBegin - b.characterOffsetBegin
                    });
                    i2.sort(function(a,b){
                        return a.characterOffsetBegin - b.characterOffsetBegin
                    });
                    var orderratio = 0;
                    i1.forEach(function(f,index){
                        if (f.lemma === i2[index].lemma) orderratio++;
                    });
                    orderratio /= i1.length;
                    segID++;

                    //gather different POS tags
                    var meta = new Set();
                    i1.forEach(function(o){meta.add(o.pos);});

                    //create object that is forwarded to the frontend:
                    final.push({type:'pos', id: segID,
                        docnormal:dnormal_sliced, mainnormal:rnormal_sliced,
                        docID: d.id, refID:refID,
                        refIntersections: i1, docIntersections: i2,
                        meta: [...meta],
                        refLeftOffset: i1[0].characterOffsetBegin,
                        refRightOffset: i1[i1.length-1].characterOffsetBegin,
                        docLeftOffset: i2[0].characterOffsetBegin,
                        docRightOffset: i2[i2.length-1].characterOffsetBegin,
                        refLeftText: i1[0].originalText, refRightText: i1[i1.length-1].originalText,
                        docLeftText: i2[0].originalText, docRightText: i2[i2.length-1].originalText,
                        orderratio: orderratio,
                        gapfeatures: dset.size - i2.length,
                        refLength: i1[i1.length-1].characterOffsetEnd - i1[0].characterOffsetBegin ,
                        docLength: i2[i2.length-1].characterOffsetEnd - i2[0].characterOffsetBegin
                    });
                }
            }
        });
    });
    return final;

}

function _generateNGrams(f, id){
    //f is a feature array, id denote's the current document ID
    var res = [];
    for (var i=0; i<f.length; i++){
        var lookup = [];
        var tmp = [];
        for (var j= i; j<Math.min(i+10, f.length); j++){
            tmp.push(f[j]);
            if (f[j].ner && f[j] !== 'O'){
                lookup.push(f[j].lemma);
            } else { //to-do: insert NER magic here
                lookup.push(f[j].lemma);
            }
        }
        res.push({id: id, details:tmp, normal: lookup});
    }
    return res;
}
























/*
     DIFFERENT MATCHING ALGORITHM
        Actually the first version I implemented. It takes segment character length and only same boundary features
        into account. Faster than the above, but with more false positives.

 */
function _nerInner(docs, refID){ //deprec
    var doc_lookup = {};
    var feature_lookup = {};
    var unique = [...new Set(docs[refID].features.map(item => item.normal))];
    unique.forEach(function(u){
        feature_lookup[u] = {};
        docs.forEach(function(doc,i){
            if (i !== refID){
                if (!doc_lookup.hasOwnProperty(i)) doc_lookup[i] = [];
                doc.features.forEach(function(f){
                    if (f.normal == u){
                        doc_lookup[i].push(f);
                        if (!feature_lookup[u].hasOwnProperty(i)) feature_lookup[u][i] = [];
                        feature_lookup[u][i].push(f);
                    }
                });
            }
        });
    });


    //clean feature lookup:
    for (var k in feature_lookup){
        if (Object.keys(feature_lookup[k]).length < 1) delete feature_lookup[k];
    }

    var res = [];
    for (var i= 0; i< docs[refID].features.length-1; i++){
        var f1 = docs[refID].features[i];
        if (feature_lookup.hasOwnProperty(f1.normal)){
            for (var j= i+1; j< docs[refID].features.length; j++){
                var f2 = docs[refID].features[j];
                if (feature_lookup.hasOwnProperty(f2.normal) && Math.abs(f1.offset-f2.offset)<300){
                    for (var docID in feature_lookup[f1.normal]){
                        if (feature_lookup[f2.normal].hasOwnProperty(docID)){
                            var reduced = reduceCandidates(feature_lookup[f1.normal][docID], feature_lookup[f2.normal][docID], docID, refID, f1.text, f2.text,  f1.offset, f2.offset);
                            res = res.concat(reduced);
                        }
                    }
                }
            }
        }
    }
    return res;
}

function reduceCandidates(featureset1, featureset2, docID,refID, reflefttext, refrighttext, refleftoffset, refrightoffset){ //deprec
    var res = [];
    featureset1.forEach(function(a){
        featureset2.forEach(function(b){
            if (a.offset<b.offset  && Math.abs(a.offset-b.offset)<300 ){
                segID++;
                res.push({type:'ner', id: segID,
                          left:a.normal, right:b.normal,
                          docID: parseInt(docID), refID:parseInt(refID),
                          docLeftText: a.text, docRightText: b.text,
                          docLeftOffset: a.offset, docRightOffset:b.offset,
                          refLeftText: reflefttext, refRightText: refrighttext,
                          refLeftOffset: refleftoffset, refRightOffset: refrightoffset,
                          classLeft: a.type, classRight: b.type
                });
            }
        });
    });
    return res;
}




