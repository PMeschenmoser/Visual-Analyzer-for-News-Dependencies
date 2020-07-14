/**
 * Author: P. Meschenmoser
 * For a given set of documents, this module returns an array  with [{index: id, values:[r,g,b,a]}]. It is called by actor/processor.
 */


var getColormap= function() {
    //a dummy colormap.
    //filenames are used for assigned the color value. this one remains the same,
    //whereas ID do not have to be unique with respect to multiple article loads-
    // ID's are unique within one loaded set of articles
    return {'news_world-asia-china-37906226_1480676515.html.json': [255, 0,  100, 0.1]}
};

module.exports = {
    apply: function (docs) {
        var result = []
        var colormap = getColormap();
        docs.forEach(function(d,i){
            if (colormap.hasOwnProperty(docs[i].filename)){ // do we have a color for that filename?
                result.push({index: i, values: colormap[docs[i].filename]});
            }
        });
        return result; //returns [{index: id, values:[r,g,b,a]}]
    }
};
