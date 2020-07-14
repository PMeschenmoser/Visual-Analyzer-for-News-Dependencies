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
    var _ranks = {in:[], out:[]}; //averaged in and out edge ranks for articles

    /*
        --Now--
        container: '#header_data',
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
        $.post("/datalayer/importFromServer", {pairs:pairs, metric:$('#select_metric').val()}, 'json').done(function(res) {
            // res could have the properties res.error or res.data.links + res.data.docs
            validateServerRes(res, function(){ //catch query errors
                _clear();
                res.data.docs.forEach(function(doc){_cache.push(doc);});
                console.log("after server",_cache);
                _options.afterImport({links:res.data.links, docs:_cache}, true);
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

    function validateServerRes(res, onSuccess){
        /*
            Validates the server response. res is an object that can have the properties error or data.
            This function triggers also a error message, when no data objects were at the server.
            onSuccess (function)
         */
        if (res.error){
            _options.errorHandler.toBox('Could not access our data tables.');
            _options.errorHandler.toConsole('Database Error',d.error);
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
        var aliases = $('#dia_import').data('public').getAliases();  //object for JSON alias, c.f. importdia.js
        var datepattern = /([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2})(:[0-9]{2})?/; //fixed date pattern for JSONs
        var datekeys = ['year', 'month', 'day', 'hour', 'min']; //the parsed object will have these keys -> generic + system independent date reference
        reader.onload = function(content){
            try { //catch parse errors
                var parsedJSON = JSON.parse(content.target.result);
                var isValid = true; // the object is only valid, if it contains all the keys, referenced in the import dialog!
                for (var required in aliases){
                    if (!parsedJSON.hasOwnProperty(aliases[required])){ //invalid
                        isValid = false;
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
                _cache.sort(function(a,b){return a.filename.localeCompare(b.filename);});
                _options.afterImport({docs:_cache},false);
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

    public.computeRanks = function(linklist){
        _ranks = {in: [], out : []};
        var inscore = {};
        var incounts = {};
        var outscore = {};
        var outcounts = {};
        linklist.forEach(function(link){
            inscore[link.source] = 0; outscore[link.source] = 0; outcounts[link.source] = 0; incounts[link.source] = 0;
            inscore[link.target] = 0; outscore[link.target] = 0; outcounts[link.target] = 0; incounts[link.target] = 0;
        });
        linklist.forEach(function(link){
            var src = _cache[parseInt(link.source)];
            var src_date = new Date(src.year, parseInt(src.month)-1, src.day, src.hour, src.min);
            var target = _cache[parseInt(link.target)];
            var target_date = new Date(target.year, parseInt(target.month)-1, target.day, target.hour, target.min);
            if (src_date <= target_date){
                outscore[link.source]+= link.value; inscore[link.target]+= link.value;
                outcounts[link.source]++; incounts[link.target]++;
            } else {
                outscore[link.target]+= link.value; inscore[link.source]+= link.value;
                outcounts[link.target]++; incounts[link.source]++;
            }
        });
        for (var node in outscore) _ranks.out.push({id:node, title:_cache[node].title, score: outscore[node]/Math.max(1,outcounts[node])});
        _ranks.out.sort(function(a,b){return b.score- a.score});
        for (var node in outscore) _ranks.in.push({id:node, title:_cache[node].title, score: inscore[node]/Math.max(1,incounts[node])});
        _ranks.in.sort(function(a,b){return b.score- a.score});
    };

    public.getRanks = function(){
       return _ranks;
    };

    constructor()
};