(function() {

$.widget("ui.movepanel", {
    options: {
        moveobject: null,
        savecallback: function() {},
    },

    bnPosX: $("<button type=button class='movepanel_button'>/\\</button>"),
    bnNegX: $("<button type=button class='movepanel_button'>\\/</button>"),
    bnPosY: $("<button type=button class='movepanel_button'>&gt;</button>"),
    bnNegY: $("<button type=button class='movepanel_button'>&lt;</button>"),
    bnPosZ: $("<button type=button class='movepanel_button'> + </button>"),
    bnNegZ: $("<button type=button class='movepanel_button'> - </button>"),

    moveObject: function(dir) {
        if(this.options.moveobject)
        {
            this.options.moveobject.x += dir.x;
            this.options.moveobject.y += dir.y;
            this.options.moveobject.z += dir.z;
        }

        this.updateDisplay();        
    },

    _create: function() {
        this.bnPosX.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:1, y:0, z:0 } );
        });

        this.bnNegX.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:-1, y:0, z:0 });
        });

        this.bnPosY.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:0, y:1, z:0 });
        });

        this.bnNegY.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:0, y:-1, z:0 });
        });

        this.bnPosZ.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:0, y:0, z:1 });
        });

        this.bnNegZ.bind("click", { self: this }, function(e) {
            e.data.self.moveObject( { x:0, y:0, z:-1 });
        });

        this.drawDisplay();
    },

    //Complete render
    drawDisplay: function() {
        this.element.empty();

        if(!this.options.moveobject)
        {
            this.element.append("No object selected!");
            return;
        }

        this.element.append("<b>Position: " + this.options.moveobject.name + "<hr>");

        var rows = 3;
        var cols = 3;
        
        var tbl = $("<table border=0 cellspacing=0 cellpadding=2 width=100%>");
        var tbc = [];
        var tbr = [];
        tbr[0] = $("<tr></tr>");
        tbc[0] = [];
        tbr[1] = $("<tr></tr>");
        tbc[1] = [];
        tbr[2] = $("<tr></tr>");
        tbc[2] = [];

        tbc[0][0] = $("<td></td>");
        tbc[0][1] = $("<td></td>");
        tbc[0][2] = $("<td></td>");
        tbc[0][0].append("&nbsp;");
        tbc[0][1].append(this.bnPosX);
        tbc[0][2].append("&nbsp;");

        tbc[1][0] = $("<td></td>");
        tbc[1][1] = $("<td></td>");
        tbc[1][2] = $("<td></td>");
        tbc[1][0].append(this.bnNegY);
        tbc[1][1].append("&nbsp;");
        tbc[1][2].append(this.bnPosY);

        tbc[2][0] = $("<td></td>");
        tbc[2][1] = $("<td></td>");
        tbc[2][2] = $("<td></td>");
        tbc[2][0].append("&nbsp;");
        tbc[2][1].append(this.bnNegX);
        tbc[2][2].append("&nbsp;");

        for(var x = 0; x < rows; x++)
        {
            for(var y = 0; y < cols; y++)
            {
                tbr[x].append(tbc[x][y]);
            }
            tbl.append(tbr[x]);
        }
        
        this.element.append(tbl);
    },

    //Update position values
    updateDisplay: function() {

    },

    _setOption: function(option, value) {
        $.Widget.prototype._setOption.apply(this, arguments);
        this.drawDisplay();
    },

    destroy: function() {
        this.element.next().remove();
    }
});

}) (jQuery);
