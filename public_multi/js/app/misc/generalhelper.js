/**
 * Author: P. Meschenmoser
 * This class gathers public functions which might be helpful within the whole frontend, not only for vislayer.js
 * Constructed in vislayer.js and main.js, but it's possible anywhere....
 */
var Generalhelper = function() {
    var public = this;

    public.getBrowserCompatibility = function(){
        /*
            Checks whether the UA is Firefox or Microsoft Edge.
            Malihu's customScrollbar in combination with svg:foreignObjects
            is only applicable in those user agents.
         */
        var firefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        var edge = navigator.userAgent.toLowerCase().indexOf("edge") > -1;
        return firefox || edge;
    };

    public.getURLParameter = function(name){
        /*
            The standard/expert mode can be picked via the localhost:3000/mode:name. We want to get the xyz. Thus,
            name = 'mode'.
            c.f. http://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513

         */
        return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
    };

    public.dateformat = function(date){
        /*input: (JS) date string or date object
          out: formatted string
          -> %x - the locale’s date, such as %-m/%-d/%Y.
          -> %X - the locale’s time, such as %-I:%M:%S %p.
          -> %a - abbreviated weekday name.*
          c.f. d3 time docu*/
        var format = d3.timeFormat('%X, %x (%a)');
        return format(new Date(date));
    };
};