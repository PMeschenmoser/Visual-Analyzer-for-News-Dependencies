/**
 * Author: P. Meschenmoser
 *
 * This class helps in managing the the small multiple pixel visualisations for permutation matrices.
 * `g` is the container of all small multiples. Instantiated in vislayer.js.
 *
 */

var Smallm = function(g){
var public = this;
var _barwidth;
var _barheight;
var _centiheight;
var _centiwidth;


function _constructor(){
    //box dimensions for small multiples
    _barwidth = 4;
    _barheight = 4;
    //dimensions position indicator right to the permutation matrix
    _centiheight = 50;
    _centiwidth = 2;
}

public.updateData = function(){
    //request data object from earlier call in the visualisation layer
    var join = g.selectAll('.smallm').selectAll('rect').data(function(d){
        return d.matrix
    });
    join.exit().remove(); //remove old boxes
    join.enter().append('rect');//enter new boxes
    g.selectAll('.smallm').selectAll('rect').attr('width', function(d,i){
        return (i === 0) ?  _centiwidth : _barwidth;
    }).attr('height', function(d,i){
            return (i === 0) ? _centiheight: _barheight ;
    }).attr('transform', function(d,i){
            var xaddendum;
                if (i === 0){ //first box
                    xaddendum = 1;
                } else if ( Math.floor(i/50)> 0){ //x translate for second row
                    xaddendum = -5;
                } else { //everything else
                    xaddendum =-1;
                }
            //shift up, if there are more than 50 segments in a row
            var y = (i === 0) ? -_centiheight/2 : -_barheight - Math.floor(i/50) * _barheight;
                //note that we position the pixels from right to left to enable a better comparison
        // between permutation matrices
        return 'translate('+ (-(i%50)*_barwidth+xaddendum) + ','+y+')';
    }).attr('fill', function(d,i){
            if (i === 0) return 'black'; //position indicator
            return (d === 1) ? 'green' : '#a6cee3'; //green if segment is at the right position
    });
};

public.updateVis = function() {
    g.selectAll('.smallm').attr('opacity', function () {
       //return d3.select('.link:nth-child('+i+')').attr('opacity');
        return 1;
    });
};

_constructor();
};