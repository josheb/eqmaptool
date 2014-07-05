//http://stackoverflow.com/questions/21666590/jqueryui-dialog-scroll-position-resets-on-focus-of-another-dialog
$.widget('ui.dialog', $.ui.dialog, { _moveToTop: function( event, silent ) {
    var $parent = this.uiDialog.parent();
    var $elementsOnSameLevel = $parent.children();

    var heighestZIndex = 0;
    $.each($elementsOnSameLevel, function(index, element) {
        var zIndexOfElement = $(element).css('z-index');
        if (zIndexOfElement) {
            var zIndexOfElementAsNumber = parseInt(zIndexOfElement) || 0;
            if (zIndexOfElementAsNumber > heighestZIndex) {
                heighestZIndex = zIndexOfElementAsNumber;
            }
        }
    });
    var currentZIndex = this.uiDialog.css('z-index');

    var moved;
    if (currentZIndex >= heighestZIndex) {
        moved = false;
    } else {
        this.uiDialog.css('z-index', heighestZIndex + 1);
        moved = true;
    }

    if ( moved && !silent ) {
        this._trigger( "focus", event );
    }

    return moved;
}});
