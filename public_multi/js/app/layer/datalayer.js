/**
 * Author P. Meschenmoser
 * This class contains file parsers for .txt and .json files. It also requests information from the backend.
 * Parsed/requested article data is saved into _cache. So, there are full data objects saved client-sided.
 * In the visualisation layer, only id and date are bound to article containers. Thus, the ID is used to
 * request more information from the data layer.
 * The data layer is added (if needed), when the import dialog gets opened (i.e. in events/importdia.js)
 */
var Datalayer = function(container, options){
    var public = this;
    var _simlist;

    /*
     --Now--
     container: '#datalayer',
     options: with _options.afterImport, c.f. initEvents in main.js

     */
    var _options = { //standard values
        afterImport: function(){},
        errorHandler: {toConsole:function(){},toBox:function(){}}
    };

    var _cache = [];

    function constructor(){
        for (var key in options) { //apply user-defined options
            if (options.hasOwnProperty((key)) && _options.hasOwnProperty(key)) _options[key] = options[key];
        }
        $(container).data('public', public); //bind public functions to container
    }


    public.importFromFilesystem = function(files){
        _clear();
        var reader;

        //when are all valid files imported?
        var goalNo = files.length;
        //goalNo needs to be requested dynamically via goal.get. analogous to goal.decrement (on error)
        var goal = {get:function(){return goalNo}, decrement: function(){
            goalNo--;
            console.log("decrement",goalNo);
            console.log("total", goal.get());
        }};

        for (var i= 0; i<files.length; i++){ //FileList won't work with forEach
            reader = new FileReader(); //one reader per iteration required
            reader.onerror= function(e){
                goal.decrement();
                _options.errorHandler.toConsole("Read Error", e)
            };
            /* then either JSON or txt is imported. In these functions on-load listeners are added to the reader
             above. This is where the actual parsing + importing to _cache happens!
             */
            if  (files.item(i).name.endsWith(".json")){ //import JSON
                _importJSON(reader,files.item(i).name.slice(0,-5), goal);
            } else if (files.item(i).name.endsWith(".txt")){ //import txt
                // instead of 'else'- further format support in future?
                _importTxt(reader, files.item(i).name.slice(0,-4), goal);
            }
            reader.readAsText(files.item(i)); //the actual read process
        }
    };

    public.getServerOverview = function(cb){
        /*
         This function is used to fill the data table (with sections, article count, topic count, etc)
         It is called whenever the import dialog gets opened.
         cb is a function, that gets executed after a successful server request. In that case, rows
         are added to the data table. The function cb gets called with an ordered 2D array (for rows and columns).
         */
        // jquery's datatables have direct ajax support
        // but that way, code is much more structured and modularised
        $.post("/datalayer/getServerOverview", {}, 'json').done(function(res) {
            //res is an object and contain res.error and res.data = [{section:..., ...},...]
            //first, catch query errors:
            validateServerRes(res, function() {
                var results = []; //first array dimension
                //db returns object (...with unordered keys)
                var keys = ['section', 'topic', 'articles', 'sources'];
                //order data wrt keys and return array
                res.data.forEach(function (d) {
                    var result = []; //second array dimension
                    keys.forEach(function (key) { //correct ordering
                        result.push(d[key])
                    });
                    results.push(result);
                });
                cb(results); //adios.
            });
        });
    };

    public.importFromServer = function(pairs){
        /*
         This function requests parsed data objects from the server.
         It's called on button click (c.f. _btnEvents in importdia.js)
         pairs is an array with the form [{section: ..., topic: ...}, ...]
         This parameter is sent to the server along the currently selected metric.
         On successful import: call _options.afterImport with the computed similarity matrix and document array
         */
        $.post("/datalayer/importFromServer", {pairs:pairs, metric:'cosine'}, 'json').done(function(res) {
            // res could have the properties res.error or res.data.links + res.data.docs
            validateServerRes(res, function(){ //catch query errors
                _clear();
                res.data.docs.forEach(function(doc){_cache.push(doc);});
                _simlist = res.data.links;
                _options.afterImport({docs:_cache, matches: res.data.matches}, true);
            });
        });
    };

    function _clear(){
        _cache = [];
    }

    public.getCacheSize = function(){
        return _cache.length;
    };

    public.getDateInfo = function(){
        /*
         This function is called when updating article data in the visualisation.
         There, only an array of dates is needed, next to the extent: [minDate, maxDate]
         Access to full data objects via public.getFromCache(ID)
         */
        var dates = [];
        for (var i = 0; i < _cache.length; i++){
            var d =  _cache[i];
            dates.push({id:i, date:new Date(d.year, parseInt(d.month)-1, d.day, d.hour, d.min)});
        }
        return {dates:dates, extent:d3.extent(dates, function(d){ return d.date})};
    };

    public.getFromCache = function(i){
        /*
         i is the article ID. Returns full data object for this article.
         c.f. public.getDateInfo()
         */
        if (i >= 0 && i<_cache.length){
            return _cache[i];
        } else { //invalid article ID
            _options.errorHandler.toConsole('Could not access Filesystem Cache.', {});
            return {};
        }
    };

    public.getCache = function(){ return _cache};
    public.setCache = function(c){ _cache = c};
    public.getSimilarityDomain= function(mainarticle){
        var min = 1;
        var max = 0;
        _simlist.forEach(function(s){
            if (parseInt(s.source) === mainarticle || parseInt(s.target) === mainarticle){ //sim object with mainarticle?
                if (s.value < min) min = s.value; //new min
                if (s.value > max) max = s.value; //new max
            }
        });
        return [min, max];
    };
    public.getSimilarity = function(i,j){
        return _simlist.filter(function(f){
            return parseInt(f.source) == Math.min(i,j) && parseInt(f.target) == Math.max(i,j);
        })[0].value;
    };

    public.getDocumentLength = function(i){
        return _cache[i].content.length;
    }; 
    
    function validateServerRes(res, onSuccess){
        /*
         Validates the server response. res is an object that can have the properties error or data.
         This function triggers also a error message, when no data objects were at the server.
         onSuccess (function)
         */
        if (res.error){
            _options.errorHandler.toBox('Could not access our data tables.');
            _options.errorHandler.toConsole('Database Error',res.error);
        } else if (res.data.length < 1 && res.data.docs.length < 1){
            _options.errorHandler.toBox('No database items were found.');
        } else {
            onSuccess(); //everything worked!
        }
    }

    function _importJSON(reader, filename,  goal){
        /*
         This function is called by public.importFromFilesystem.
         It adds an appropiate .onload event handler to the submitted reader. Here, the actual object
         parsing takes place.
         Filename without file ending + detailed path.
         goal is an object of functions for checking, whether all files were parsed already.
         */
        // For now,w e assume a flat JSON hierarchy.
        var aliases = $('#importDialog').data('public').getAliases();  //object for JSON alias, c.f. importdia.js
        var datepattern = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2})(:[0-9]{2})?/; //fixed date pattern for JSONs
        var datekeys = ['year', 'month', 'day', 'hour', 'min']; //the parsed object will have these keys -> generic + system independent date reference
        reader.onload = function(content){
            try { //catch parse errors
                var parsedJSON = JSON.parse(content.target.result);
                var isValid = true; // the object is only valid, if it contains all the keys, referenced in the import dialog!
                for (var required in aliases){
                    if (!parsedJSON.hasOwnProperty(aliases[required])){ //invalid
                        isValid = false;
                        console.log("does not contain:" +   required);
                    } else {
                        if (required !== aliases[required]) {
                            //normalize aliases in data object!
                            parsedJSON[required] = parsedJSON[aliases[required]];
                            delete parsedJSON[aliases[required]];
                        }
                    }
                }
                var match = datepattern.exec(parsedJSON.ts);
                //parse date property and make it 'atomic'
                if (!match || match.length < 6){ //i.e. whole match +  groups
                    _options.errorHandler.toConsole("Invalid Date Pattern. Skip file", match);
                    isValid = false; //nothing happens while reading, as onload is empty in a new filereader
                } else {
                    datekeys.forEach(function(key,i){parsedJSON[key] = match[i+1];});
                    parsedJSON.filename = filename;
                    parsedJSON.tsobj = new Date(parsedJSON.year, parsedJSON.month, parsedJSON.day, parsedJSON.hour, parsedJSON.min);
                }
                if (isValid){
                    _cache.push(parsedJSON);
                } else {
                    goal.decrement();
                    _options.errorHandler.toConsole("Invalid JSON Keys. Skip file.", {});
                }
            } catch(e){ //parse error
                goal.decrement();
                _options.errorHandler.toConsole("Parse Error. Skip file.",e);
            }
            //are all files read already?
            // plus: we need at least 2 documents in the cache
            if (public.getCacheSize() === goal.get() && goal.get() > 1){
                _cache.sort(function(a,b){return a.tsobj - b.tsobj;}); //sort by date

                //ready, compute simlist
                $.post("/processor/run", {docs: _cache, refid:0, metric:'cosine'}, 'json').done(function(res) {
                    validateServerRes(res, function(){ //catch query errors
                        _simlist = res.data.links;
                        _options.afterImport({docs:_cache, matches: res.data.matches}, true);
                    });
                });

            }

        }
    }

    function _importTxt(reader, filename, goal){ //filename without '.txt'
        /*
         This function is called by public.importFromFilesystem.
         It adds an appropiate .onload event handler to the submitted  txt reader. Here, the actual object
         parsing takes place. It also includes the dynamic regex construction based on jQueryUI's sortable elements.
         Filename without file ending + detailed path.
         goal is an object of functions for checking, whether all files were parsed already.
         */
        var pattern = "";
        var tags = [];
        var subpatterns = {year: "([0-9]{4})", month:"([0-9]{2})", day:"([0-9]{2})", time:"([0-9]{4})", title:"([^_]{3,})", source:"([^_]{3,})"};
        $('.sortable li').each(function(i,e){
            //bring the subpatterns into the correct pattern
            pattern += (i < 5) ? (subpatterns[$(e).attr('value')] + $('#separator').val()) : "(.{3,})";
            tags.push($(e).attr('value'));
        });
        var regex = new RegExp(pattern);
        var match = regex.exec(filename);
        if (!match || match.length !== 7){ //i.e. whole match +  groups
            _options.errorHandler.toConsole("Invalid Filename Pattern. Skip file", match);
            goal.decrement();
            return; //nothing happens while reading, as onload is empty in a new filereader
        }
        var obj = {};
        tags.forEach(function(k, i){
            if (k !== "time"){ //add e.g. source and title
                obj[k] = match[i+1];
            } else { // split time value:
                obj["hour"] = match[i+1].substring(0,2);
                obj["min"] = match[i+1].substring(2,4);
            }
        });
        obj.filename = filename;
        reader.onload = function(content){ //after reading:
            obj.content = content.target.result; //add content property
            _cache.push(obj);
            if (public.getCacheSize() === goal.get() && goal.get() > 1){ //are we finished? more than 1 doc in cache?
                _cache.sort(function(a,b){return a.filename.localeCompare(b.filename);});
                _options.afterImport({docs:_cache},false);
            }
        }
    }


    constructor();
    return public;
};