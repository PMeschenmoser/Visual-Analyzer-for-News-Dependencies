/**
 * Author: P. Meschenmoser
 * A class for central error handling.
 * Constructed in main.js
 */

var Errorhandler = function(){
    var public = this;
    var history = []; //future work

    public.toConsole = function(msg,obj){
        console.log(msg,obj);
        history.push({message:msg,obj:obj});
    };

    public.toBox = function(msg){
        alert(msg); 
    }
};