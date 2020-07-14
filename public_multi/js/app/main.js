define(['jquery', 'bootstrap', 'jquery-ui', 'd3', 'misc/focusbox', 'events/heuristicsdia', 'events/visdia', 'gui/init', 'layer/datalayer', 'layer/vislayer', 'layer/segmentlayer', 'misc/visinit', 'misc/vishelper', 'misc/generalhelper', 'misc/smallm',  'events/importdia', 'misc/errorhandler', 'misc/visconnector',  "datatables.net", "scrollto"], function($) {
    $(function() {
        //check for browser compatibility:
        if (!(new Generalhelper().getBrowserCompatibility())){
            alert('Please use the latest Mozilla Firefox or Microsoft Edge.')
            return;
        }
        var h = $('#focusbox-right').height();
        $('#canvas').height(h+65); //make canvas height dependent from height of full-text view
        var e_handler = new Errorhandler();
        new Guiinit();
        //instantiate javascript wrappers for full-text content
        var fright = new Focusbox('#focusbox-right', 'ref');
        new Focusbox('#focusbox-left', 'doc');
        //segment layer
        var seglayer = new Segmentlayer();
        var connector;
        $('body').removeClass('modal-open'); //needed, if want to fully remove the backdrop

        var dlayer = new Datalayer('#datalayer', {afterImport:function(d){
            $('button.close').css('display','block'); //dialog can be closed again after initial import
            //remove dialog backdrop:
            $('#importDialog').data('bs.modal').options.keyboard = true;
            $('#importDialog').data('bs.modal').options.backdrop = 'dynamic';

            $('#importDialog').modal('hide');

            seglayer.setSegments(d.matches, false);
            var id_main = 0; //main article after import

            fright.setMainArticle(d.docs[id_main]); //set full-text to right focusbox
            var filtered = seglayer.getFiltered(); //(wrt to frontend filters)
            fright.setSegments(filtered); //apply filtered segments to right focusbox
            var v;
            if (!$('#canvas').data('public')){
                v =  new Vislayer('#canvas', {dataAccessor: function(){return $('#datalayer').data('public');}});
                connector = new Visconnector(v.getGlueMulti(), '#connectormulti'); //glue region for multiview
            } else { //canvas already initiated)
                v = $('#canvas').data('public');
            }

            v.update(id_main); //update main canvas
            connector.updateLinkData(filtered); //update glue region
            connector.updateFocus(); //update scrollbar in the glue region
            v.setSegments(filtered); //add filtered segments to the main canvas
        }});

        //initialise dialogs
        new Importdia('#importDialog', e_handler);
        new Heuristicsdia('#heuristicsDialog');
        new Visdia('#visDialog');

        //initial server request
        dlayer.getServerOverview(function (rows) {
            var tbl = $('#tbl_overviewserver').DataTable();
            //empty table, add data, redraw table:
            tbl.clear();
            rows.forEach(function (row) {tbl.row.add(row)});
            tbl.draw();
            $('#tbl_overviewserver').DataTable().draw();

        });
    });
});