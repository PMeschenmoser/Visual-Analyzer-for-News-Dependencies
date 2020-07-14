/**
 * Author: P. Meschenmoser
 *
 * This class provides basic instantiation and event handling for
 * overall gui elements (sortable, draggables, buttons, ...). It also provides event handlers for
 * mouseenter/mouseleave segments in compressed full-text. There, the idea is to trigger mouse events
 * on the actual full-text segments
 */

var Guiinit = function(container){
    var public = this;

    function constructor(){
        _init();
        $(container).data('public', public);
    }

    function _init(){
        $('.modal').on('shown.bs.modal', function() {
            //some custom modal settings
            $(".modal-header").css("padding",'2px');
            $(".modal-header").css("margin",'5px');
            $(".modal-footer").css("padding",'2px');
            $(".modal-footer").css("margin",'2px');
            $(".modal-body").css("padding",'2px');
            $(".modal-body").css("margin",'2px');
            $(".modal-dialog").css({
                'position': 'relative',
                'display': 'table',
                'overflow-y': 'auto',
                'overflow-x': 'auto',
                'width': '700px',
                'min-width': '10px'
            });

            //$('.modal-backdrop').removeClass("modal-backdrop");
            $('#heuristicsDialog > .modal-dialog').css('width', '300px');
            $('#visDialog > .modal-dialog').css('width', '300px');

        });
        $("#importDialog, #heuristicsDialog, #visDialog").draggable({
            handle: ".modal-header"
        });
        $('.sortable').sortable({revert: true});
        $('#tbl_overviewserver').DataTable({
            paging: false,
            info: false, //no 'displaying x/100 items'
            scrollY: "80px",
            order:[[2, 'desc']]
        });
        $('#importDialog').modal({backdrop: 'static', keyboard: false});
        $('button.close').css('display','none');

        $("#openImport").on('click', function(){
            if (!$("#importDialog").hasClass('in')) {
                $('#focusbox-left').hide();
                $('#heuristicsDialog').modal('hide');
                $('.overlay').hide();
                $('#importDialog').modal('show');
                $('#tbl_overviewserver').DataTable().draw();
                $('body').removeClass('modal-open');
            }
        });
        $('#heuristicsDialog, #visDialog').modal({backdrop: 'static', keyboard: false, show:false});
        $('#openHeuristics').on('click', function(){
            //limitation to keep everything consistent:
            if (!$("#importDialog").hasClass('in') && !$("#focusbox-left").is(':visible')) {
                $('#heuristicsDialog').modal('show');
                $('body').removeClass('modal-open');
            }
        });
        $('#openVissettings').on('click', function(){
            //limitation to keep everything consistent:
            if (!$("#importDialog").hasClass('in') && !$("#focusbox-left").is(':visible')) {
                $('#visDialog').modal('show');
                $('body').removeClass('modal-open');
            }
        });
        $('.accordion-toggle').on('click', function(){ //for heuristicsdia.js
            $(this).toggleClass('accordion-highlighted');
            $(this).parent().toggleClass('accordion-highlighted');
        });

        $('#canvas').on('mouseenter', 'span.doc', function(){
            $(this).addClass('hoversegment');
            //segment in compressed full-text
            var c= _getNumericClass(this);
            $('#connectormulti').data('public').resetEdgeColors();
            $('#focusbox-righttext').scrollTo($('polygon.ref.'+c).first(),0, {offset:-$('#focusbox-righttext').height()/2+20});
            //idea:trigger mouseenter on the full-text segment
            d3.selectAll('.seg.ref.'+c).node().dispatchEvent(new MouseEvent('mouseenter'));

        });

        $('#canvas').on('mouseleave', 'span.doc', function(){
            //segment in compressed full-text
            $(this).removeClass('hoversegment');
            var c= _getNumericClass(this);
            d3.selectAll('.seg.ref.'+c).node().dispatchEvent(new MouseEvent('mouseleave'));
            $('#focusbox-right').data('public').resetUnderlinings();
            $('#connectormulti').data('public').resetEdgeColors();
        });

    }

    function _getNumericClass(o){
        var tmp= $(o).attr('class').split(' ');
        for (var i= 0; i<tmp.length; i++){
            if (/\d/.test(tmp[i])) return tmp[i];
        }
        return '';
    }

    constructor();
};
