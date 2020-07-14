/**
 * Author: P. Meschenmoser
 *
 * This is a frontend layer to store, manage and filter segments.
 * The segment layer is not bound to a particular DOM element.
 */

var Segmentlayer = function(){
  var public = this;
  var _basesegs = {ner:[], pos:[]};
  var _aliasses = {};
  var _filtersettings = {pos:[], mf:[4,10], fd:[0,10], or:[0,1]}; //default filter settings

 function _constructor(){
    $('#segdummy').data('public', public);
 }

  public.setSegments = function(d){
      for (var t in _basesegs){
          _basesegs[t] = [];
      }

    for (var t in d){
          if (_basesegs.hasOwnProperty(t) && d.hasOwnProperty(t)) _basesegs[t] = _basesegs[t].concat(d[t]);
    }
  };

  public.setFilterSettings = function(f){
        _filtersettings = f;
  };

  public.getFiltered = function(){
     //for each key
     var tmp = _basesegs.pos.filter(function(f){
         //construct the filters.
         //matching features
         var mf = f.refIntersections.length >= _filtersettings.mf[0] &&  f.refIntersections.length <= _filtersettings.mf[1];
         //features in between (->'feature deviation')
         var fd = f.gapfeatures >= _filtersettings.fd[0] &&  f.gapfeatures <= _filtersettings.fd[1];
         //order ratio
         var or = f.orderratio >= _filtersettings.or[0] &&  f.orderratio <= _filtersettings.or[1];
         //part of speech filter
         var pos = posFilter(f.meta);
         return mf && fd && or && pos; //return true if all conditions are satisfied
     });

     function posFilter(meta){
         //AND filter for POS tags. Return true, if at least one of the checked tags is part of the intersecting features.
         var val = true;
         var arr = _filtersettings.pos;
        if (arr.length < 1) return val; //deactivated filter
         for (var i=0; i<meta.length; i++){
             if (arr.indexOf(meta[i])<0){
                 val = false;
                 break;
             };
         }
         return val;
     }
     _aliasses ={};
     //sort segments by position
     tmp = tmp.sort(function(a,b){return a['refLeftOffset'] - b['refLeftOffset'];});
     //construct lookups for segments and aliasses
     var seglookup = {};
     tmp.forEach(function(s){
         var objectkey = s['refLeftOffset'] + '-' + s['refRightOffset'] + '-'+  s['mainnormal'].toString();
         if (!_aliasses.hasOwnProperty(objectkey)) _aliasses[objectkey] = [];
         _aliasses[objectkey].push(s.type+''+s.id);
         seglookup[s.type+s.id] = s;
     });
      return {aliasses:_aliasses, all:tmp, seglookup:seglookup};
  };


    public.visUpdate = function(segs, id){
        //visUpdate bundles functions which need to be called when segments are changed
        var fright = $('#focusbox-right').data('public');
        var v = $('#canvas').data('public');
        var connector = $('#connectormulti').data('public');
        if (typeof segs !== 'undefined') public.setSegments(segs);
        var filtered = public.getFiltered();
        //right focusbox
        fright.setSegments(filtered);
        //visualisation layer with id for main article
        v.update(id);
        //add segments to visualisation layer
        v.setSegments(filtered);
        //update glue region
        connector.updateLinkData(filtered);
    };

  _constructor();
};