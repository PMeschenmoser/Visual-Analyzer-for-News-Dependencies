/**
 * Author: P. Meschenmoser
 * This class transforms the accordion html by adding css classes and js event handlers.
 * See wiki for required accordion html.
 * Called in main.js, initGUI()
 */

var Accordion = function (container, options) {
    var public = this;
    //default options:
    var _options = {
        active: true,
        disabledClick: function(){} //what shall happen if you click on a disabled section? currently not used
    };
    var _grps; //div containers having a header and a content div


    function constructor(){
        for (var key in options) { //apply external options:
            if (options.hasOwnProperty((key)) && _options.hasOwnProperty(key)) _options[key] = options[key];
        }

        //transform DOM structure and add classes to work with
        _grps = $(container).children('div');
        $(_grps).children(':header').addClass('acc-Header');
        $(_grps).children(':header').prepend('<span class="acc-Icon"></span>'); //this little arrow...
        $(_grps).children(':header').first().addClass('acc-FirstHeader'); //different border radius for first header
        $(_grps).children('div').addClass(function(){
            return (($(this).prev().hasClass('acc-Header')) ? 'acc-Content' : 'acc-Helper'); //in .acc-Helper small '?' could be included
        });
        
        //toggle div below header, when clicked on header
        $(_grps).on('click', '.acc-Header', function () {
            if (!_options.active) { //disabled click
                if (_options.disabledClick) _options.disabledClick();
                return;
            }
            if ($(this).next().hasClass('acc-Content')) {
                $(this).toggleClass('acc-OpenHeader'); //acc-OpenHeader adds the blue color to the header
                $(this).next().slideToggle('fast'); //toggle the content div
                $(this).children('.acc-Icon').toggleClass('acc-Deflated'); //and the icon
            }
        });

        //append the object as data attribute to the container
        $(container).data('public', public);
    }

    public.deflateAll = function () {
        if (!_options.active) return;
        $(_grps).children('.acc-Header').each(function() {
            $(this).addClass('acc-OpenHeader'); //blue header color
            var div = $(this).next();
            if (div.hasClass('acc-Content')) { //open content divs
                div.slideDown();
                $(this).children('.acc-Icon').addClass('acc-Deflated'); //icon
            }
        });
    };

    public.inflateAll = function () {
        if (!_options.active) return;
        $(_grps).children('.acc-Header').each(function () {
            $(this).removeClass('acc-OpenHeader'); //remove header color
            if ($(this).next().hasClass('acc-Content')) { //hide content divs
                $(this).next().slideUp('fast');
                $(this).children('.acc-Icon').removeClass('acc-Deflated'); //icon
            }
        });
    };
    
    public.hide = function (i) {
        if (!_options.active) return;
        var tmp = $(_grps[i]);
        tmp.children('.acc-Content').slideUp('fast', function () {
            tmp.find('.acc-Icon').removeClass('acc-Deflated');
            tmp.fadeOut('fast');
        });
    };

    public.show = function (i) {
        if (!_options.active) return;
        $(_grps[i]).fadeIn('fast');
    };
    public.getActive = function () {
        return _options.active;
    };
    public.setActive = function (bool) {
        _options.active = bool;
    };

    constructor();
};