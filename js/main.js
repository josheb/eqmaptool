//This is an elaborate, if not somewhat convoluted, design document.  Anything resembling an actual implementation is accidental.
/*

Global resources need better management, especially zone data.
We need to establish a group of dictionaries and provide references appropriately.  The best demonstration for this is the spawndata relationship with NPC's and spawn chances.
The npclist cludge works, but spawn points, spawn groups (with entries), and npc's really need to be tracked separately.  Let them reference one another by ID or other applicable key.
--Update: The only remnant from the old data structures is zonedata, which is fine.  All new zone information should go in the Z global and match database tables.

We need one smart camera with reliable input handling that knows when to move and when to type or interface with UI.
Mouse events should translate to keyboard events in an understandable way.
Hand.js is included and could provide a nice way of dragging for rotation in an intuitive way.

Some elements lend themselves to being edited inline.  These distinctions need to be more clear.
For instance, things like spawn chance need to be updated internally after they have been edited externally.
Either the editor needs a way to notify the parent document or the editing needs to be done inline where it can be handled with the other ajax requests.
It might be nice to have a form field class that automatically updates on blur with visual feedback when complete.  This may also require some state handling in the event of slow updates.
(disallow focus or target changes until a pending update is complete)

The map format needs to be updated to reflect current map changes.  Placeable objects need to be instanced instead of baked into one massive map blob.
An object model database would let us render items in the object and door tables also.
As it stands the export tool relies on the old map format exported with all placeables included and we have no knowledge of textures or non-clipping geometry.

Zone tables we need to load:
doors : id, doorid (autoinc, per zone id)
forage : id

grid : id
grid_entries : gridid

ground_spawns : id

npc_types : id

object : id

proximities : zoneid-exploreid

spawn2 : id, spawngroupID -- Positions, spawn times
spawngroup : id
spawnentry : spawngroupID, npcID -- Entries for group

zone_points : id

Upcoming priority features in no particular order:
    Create map export tool using new zone-utilities
    Make inline spawngroup chance editor
    Add NPC quest editor using ACE library - Written but not integrated!
    Set up grid edit mode
    Clean up object display widget
*/

var requests = {};
var loading = false;

var Z = {};
Z.doors = {};
Z.forage = {};
Z.grid = {};
Z.grid_entries = {};
Z.ground_spawns = {};
Z.npc_types = {};
Z.object = {};
Z.proximities = {};
Z.spawn2 = {};
Z.spawnentry = {};
Z.spawngroup = {};
Z.zone_points = {};

var zonedata;
var znames = [];

var currentzone = "";

var res = {};
res.textures = {};
res.materials = {};
res.lights = {};
res.geometries = {};
res.objects = {};

res.spawns = {};
res.grids = {};
res.groundspawns = {};
res.doors = {};
res.mapobjects = {};

var objmats = {};

var sceneroot;
var hitscene;

var camera, scene, renderer, loader, mainlight, animationid, clock, controls, framecount;

var user = {};
user.lastobject = "";
user.curobject = "";
user.curtype = "";
user.lastdist = 200;
user.curdist = 200;
user.lastspawn = -1;
user.lastgrid = -1;

var mousepos = { x: -1, y: -1, movex: -1, movey: -1 };

var opmode = "NAVIGATE";
var moverpos = { x: 0, y: 0, z: 0 };

var settings = {};
settings.version = 0;
settings.mapmat = 'standard';
settings.movespeed = 500;
settings.spawntime = 640;
settings.spawnvariance = 64;

var mapmats = {};

var gridtypes = [ "Circle", "10 Closest", "Random", "Patrol", "End, Depop W/ Timer", "5 Closest, Random in LOS", "End, Depop WO/ Timer" ];
var pausetypes = [ "Random Half", "Full", "Random Full" ];

var qs = {};
var load_from_get = false;

var tracker = {};
tracker.unsaved = [];
tracker.npcs = [];
tracker.spawngroups = [];

$(document).ready( function() {

    /*
    Track query string options here.  For now we just load a queried zone.
    Possible future options:
        x,y,z,h position in map
        Target object
        Cursor position

    Handy QS parsing function
    http://stackoverflow.com/questions/647259/javascript-query-string
    */
    location.search.substr(1).split("&").forEach(function(item) { qs[item.split("=")[0]] = item.split("=")[1]})
    if(qs.zone) { load_from_get = qs.zone; }

    $(document.body).bind( "keypress", function(event) { keyProc(event); } );
    $(document).mousemove( function(event) { mouseMove(event); });
    //$(document).click( function(event) { mousepos.x = event.clientX; mousepos.y = event.clientY; updateCursor(); });
    window.setInterval( function() { updateFPS(); }, 1000);

    $(document.forms['settingsform'].s_version).val(settings.version);
    $(document.forms['settingsform'].s_speed).val(settings.movespeed);
    $(document.forms['settingsform'].s_spawntime).val(settings.spawntime);
    $(document.forms['settingsform'].s_spawnvariance).val(settings.spawnvariance);

    /* Stop camera functions when a text box is focused. */
    //$("input").on("focus", function() { startText(); });
    //$("input").on("blur", function() { endText(); });
	
	/* If any UI window is hovered over, stop other controls */
	$(".ui_window").mouseenter(function() { startText(); });
	$(".ui_window").mouseleave(function() { endText(); });

    init();

    //Prevent camera functions when resizing dialogs.
	$(".ui-dialog-titlebar").mouseenter(function() { startText(); });
	$(".ui-dialog-titlebar").mouseleave(function() { endText(); });

	$(".ui-resizable-se").mouseenter(function() { startText(); });
	$(".ui-resizable-se").mouseleave(function() { endText(); });

	$(".ui-resizable-s").mouseenter(function() { startText(); });
	$(".ui-resizable-s").mouseleave(function() { endText(); });

	$(".ui-resizable-n").mouseenter(function() { startText(); });
	$(".ui-resizable-n").mouseleave(function() { endText(); });

	$(".ui-resizable-e").mouseenter(function() { startText(); });
	$(".ui-resizable-e").mouseleave(function() { endText(); });

	$(".ui-resizable-w").mouseenter(function() { startText(); });
	$(".ui-resizable-w").mouseleave(function() { endText(); });

    //Akka hotkeys, slightly adjusted and moved from index.html (Alt+1,2,3 does tab swaps in chrome on linux, perhaps others)
    $(document).keydown(function (e){
        console.log('key code is: ' + e.which + ' ' + (e.ctrlKey ? 'Ctrl' : '') + ' ' + (e.shiftKey ? 'Shift' : '') + ' ' + (e.altKey ? 'Alt' : ''));
        if(e.altKey && e.which == 88){ // Alt + X - Camera To Cursor
            gotoObject(user.cursor);
        }
        if(e.altKey && e.which == 67){ // Alt + C - Camera to Selection
            gotoObject(user.curobject);
        }
        if(e.altKey && e.which == 86){ // Alt + V - Selection to Cursor
            selToCursor();
        }
        if(e.altKey && e.which == 66){ // Alt + B - Cursor to Selection
            cursorToSel();
        }
        if(e.altKey && e.which == 90){ // Find Best Z for Selection
            selToZ();
        }
        if(e.altKey && e.which == 78){ // Add Selected SG
            addSpawngroup();
        }
        if(e.altKey && e.which == 77){ // Create SG From Selected
            createSpawngroup();
        }
        if(e.altKey && e.which == 71){ // Create Grid
            addGridEntry();
        }
        if(e.altKey && e.which == 188){ // Adjust heading
            ToggleHEdit();
        }
        document.getElementById('editor').focus();
    });
    document.getElementById('editor').focus();
});

function toRad(d) { return( parseFloat(d * (Math.PI / 180)) ); }
function toDeg(r) { return ( parseFloat(r / (Math.PI / 180)) ); }

/* Heading Translators (toEQ/fromEQ) */
function toEQ(d) { return( 255 * (d/360) ); }
function fromEQ(d) { return( 360 * (d/255) ); }

function toggleWin(id)
{
    if($('#'+id).dialog("isOpen")) { $('#'+id).dialog("close"); }
    else { $('#'+id).dialog("open"); $('#'+id).dialog("moveToTop"); }
}

function getZones()
{
    if(requests.zonelist) { return; }
    $.get(_c.datatypes.zone.src, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('zonelist', stat, err); });
}

function getZoneData()
{
    var qs = {};
    qs.zn = currentzone;
    qs.znum = zonedata[currentzone].zoneidnumber;
    qs.zid = zonedata[currentzone].id;
    qs.ver = settings.version;

    $.get(_c.datatypes.spawn.src, qs, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('spawns', stat, err); });
    $.get(_c.datatypes.grid.src, qs, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('grids', stat, err); });
    //$.get(_c.datatypes.doors.src, qs, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('doors', stat, err); });
    //$.get(_c.datatypes.object.src, qs, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('objects', stat, err); });
    //$.get(_c.datatypes.groundspawn.src, qs, function(data) { procData(data); }).fail( function(obj, stat, err) { reqFail('groundspawns', stat, err); });
}

function reqFail(rtype, stat, err)
{
    //Log the type and reset the status
    log("Request failed: " + rtype + ": " + stat + " - " + err);
    requests[rtype] = 0;
}

function init()
{
    if ( ! Detector.webgl ) { Detector.addGetWebGLMessage(); }

    framecount = 0;
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer( { clearColor: 0xCCCCFF, clearAlpha: 1 } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    $(renderer.domElement).click( function(event) { mousepos.x = event.clientX; mousepos.y = event.clientY; updateCursor();  });
    $(renderer.domElement).bind( "keypress", function(event) { keyProc(event); } );

    clock = new THREE.Clock();
    
    scene.add( new THREE.AmbientLight( 0x555555 ) );
    mainlight = new THREE.PointLight( 0xFFFFFF, 1, 100000 );
    mainlight.position = camera.position;
    scene.add( mainlight );

    $("#sidenav").dialog({ width: 300, height: 500, position: { my: "left top", at: "left bottom+8", of: $("#toolbar") } });
    $("#editor").dialog({ width: 800, height: 600, position: { my: "left top", at: "right+2 top-25", of: $("#sidenav") }, autoOpen: false });
    $("#questeditor").dialog({ width: 800, height: 600, position: { my: "left top", at: "right+2 top-25", of: $("#sidenav") }, autoOpen: false });
    $("#zonemenu").dialog({ width: 500, height: 500, position: { my: "center", at: "center", of: window }, autoOpen: false});
    $("#settings").dialog({ width: 400, height: 300, position: { my: "center", at: "center", of: window }, autoOpen: false });
    $("#currentzone").dialog({ width: 600, height: 700, position: { my: "top", at: "top", of: window }, autoOpen: false });
    var statusdialog = $("#status").dialog({ width: 300, height: 150, position: { my: "right-5 center", at: "right top", of: window } });
    var seldialog = $("#selection").dialog({ width: 300, height: 400, position: { my: "right+3 top+12", at: "right bottom", of: $("#status") } });
    $("#help").dialog({ width: 300, height: 200, position: { my: "center", at: "center", of: window }, autoOpen: false });

    $("#zoneinfo").tabs(); 
    $("#acc_sel_i").accordion({ icons: null, collapsible: true, heightStyle: "content" });
    $("#acc_sel_o").accordion({ icons: null, collapsible: true, heightStyle: "content" });

    //$("#tool_acc_win").accordion({ icons: null, collapsible: true, heightStyle: "content" });
    $("#tool_acc_map").accordion({ icons: null, collapsible: true, heightStyle: "content" });
    $("#tool_palette").accordion({ icons: null, collapsible: true, heightStyle: "content" });
    $("#tool_unsaved").accordion({ icons: null, collapsible: true, heightStyle: "content" });
    $("#tool_misc").accordion({ icons: null, collapsible: true, heightStyle: "content" });

    $('#editframe').attr('src', _c.editormain);
    $('#questeditframe').attr('src', _c.questeditormain);

    // https://groups.google.com/forum/#!topic/jquery-ui-dev/sP9gWig4w_o
    var statustitle = statusdialog.parents('.ui-dialog').find('.ui-dialog-titlebar');
    var targettitle = seldialog.parents('.ui-dialog').find('.ui-dialog-titlebar');
    statustitle.empty();
    targettitle.empty();

/*
    $('<table width=100% border=0 cellspacing=0 cellpadding=0><tr><td valign=top><b>Status</b></td><td valign=top align=right><button>Clear</button></td></tr></table>').appendTo(statustitle).click(
        function() {
            $("#statustext").empty();
        }
    );

    targettitle.empty();
    $('<table width=100% border=0 cellspacing=0 cellpadding=0><tr><td valign=top><b>Target</b></td><td valign=top align=right><button>Clear</button></td></tr></table>').appendTo(targettitle).click(
        function() {
            clearTarget();
        }
    );
*/

    $('<table width=100% border=0 cellspacing=0 cellpadding=0><tr><td valign=top><b>Status</b></td><td valign=top align=right><button id=statusclear>Clear</button></td></tr></table>').appendTo(statustitle);
    $('<table width=100% border=0 cellspacing=0 cellpadding=0><tr><td valign=top><b>Target</b></td><td valign=top align=right><button id=targetclear>Clear</button>|<button id=targetrefresh>Refresh</button></td></tr></table>').appendTo(targettitle);

    $("#statusclear").click( function() { $("#statustext").empty(); } );
    $("#targetclear").click( function() { clearTarget(); } );
    $("#targetrefresh").click( function() { refreshTarget(); } );

    loader = new THREE.SceneLoader();

    THREE.DefaultLoadingManager.onProgress = function ( item, loaded, total ) { loadProgress( item, loaded, total ); };
    hitscene = new THREE.Object3D();
    sceneroot = new THREE.Object3D();
    scene.add( hitscene );
    hitscene.add( sceneroot );

    //Set up some default resources
    res.cube = new THREE.BoxGeometry(5, 5, 5, 1, 1, 1);
    res.cursor = new THREE.SphereGeometry(2, 6, 6);
    //res.hline = new THREE.BoxGeometry(1, 5, 1, 1, 1, 1);

    res.hline = new THREE.Geometry();

    res.hline.vertices.push( new THREE.Vector3(0, 0, 0) );
    res.hline.vertices.push( new THREE.Vector3(0, 12, 0) );
    res.hline.vertices.push( new THREE.Vector3(0, 5, 2) );
    res.hline.vertices.push( new THREE.Vector3(0, 5, -2) );
    res.hline.vertices.push( new THREE.Vector3(0, 12, 0) );
    res.hline.vertices.push( new THREE.Vector3(2, 5, 0) );
    res.hline.vertices.push( new THREE.Vector3(-2, 5, 0) );
    res.hline.vertices.push( new THREE.Vector3(0, 12, 0) );

    res.wiremat = new THREE.MeshBasicMaterial( { "color": 0xFF0000, "wireframe": true, "wireframeLinewidth": 1 } );
    //res.wiremat = new THREE.MeshBasicMaterial( { "color": 0xFF0000, "wireframe": false, "wireframeLinewidth": 1 } );
    res.spawnmat = new THREE.MeshPhongMaterial( { "color": 0x00FF00, "ambient": 0x00FF00, "emissive": 0x44FF44, "opacity": 0.6, "transparent": true } );
    res.gridmat = new THREE.MeshPhongMaterial( { "color": 0xFFCC00, "ambient": 0xFFCC00, "emissive": 0xFF4400, "opacity": 0.6, "transparent": true } );
    res.selmat = new THREE.MeshPhongMaterial( { "color": 0x0000FF, "ambient": 0x0000FF, "emissive": 0x4444FF, "opacity": 0.6, "transparent": true } );
    res.linemat = new THREE.LineBasicMaterial( { "color": 0xFF0000 } );

    //Set up materials for types
    objmats.spawn = {};
    objmats.spawn.standard = res.spawnmat;
    objmats.spawn.selected = res.selmat;
    objmats.grid = {};
    objmats.grid.standard = res.gridmat;
    objmats.grid.selected = res.selmat;

    mapmats.standard = new THREE.MeshPhongMaterial( { "color": 0x777777, "ambient": 0x333333, "emissive": 0x222222, "shading": THREE.FlatShading } );
    mapmats.normal = new THREE.MeshNormalMaterial( { "shading": THREE.FlatShading } );
    mapmats.trans = new THREE.MeshPhongMaterial( { "color": 0x777777, "ambient": 0x333333, "emissive": 0x222222, "opacity": 0.7, "transparent": true, "shading": THREE.FlatShading } );

    res.mover = new THREE.Object3D();
    res.cyl = new THREE.CylinderGeometry(1, 1, 20, 6, 2, false);
    res.xmat = new THREE.MeshPhongMaterial( { "color": 0xFF0000, "ambient": 0xFF0000, "emissive": 0xFF0000 } );
    res.ymat = new THREE.MeshPhongMaterial( { "color": 0x00FF00, "ambient": 0x00FF00, "emissive": 0x00FF00 } );
    res.zmat = new THREE.MeshPhongMaterial( { "color": 0x0000FF, "ambient": 0x0000FF, "emissive": 0x0000FF } );
    res.hmat = new THREE.MeshPhongMaterial( { "color": 0xFF00FF, "ambient": 0xFF00FF, "emissive": 0xFF00FF } );

	/* Draw Cylindrical Items from the Cubes */
    res.moverx = new THREE.Mesh( res.cyl, res.xmat );
    res.moverx.rotation.set(0, 0, 1.5707);
    res.moverx.userData.objtype = "movex";
    res.movery = new THREE.Mesh( res.cyl, res.ymat );
    res.movery.rotation.set(0, 1.5707, 0);
    res.movery.userData.objtype = "movey";
    res.moverz = new THREE.Mesh( res.cyl, res.zmat );
    res.moverz.rotation.set(1.5707, 0, 0);
    res.moverz.userData.objtype = "movez";
    res.moverh = new THREE.Mesh( res.cyl, res.hmat );
    res.moverh.rotation.set(0, 0, toRad(45));
    res.moverh.userData.objtype = "moveh";

    res.mover.add(res.moverx);
    res.mover.add(res.movery);
    res.mover.add(res.moverz);
    res.mover.add(res.moverh);

    hitscene.add(res.mover);

    res.mover.traverse( function(child) { child.visible = false; } );

    user.cursor = new THREE.Mesh( res.cursor, res.wiremat );
    scene.add(user.cursor);

    getZones();

    log("Initialized.");

	/* Initialize Cameras */
		
    controls = new THREE.FlyControls( camera );
    controls.movementSpeed = settings.movespeed;
    controls.rollSpeed = 1;
    controls.autoForward = false;
    controls.dragToLook = false;
	
	mouse_rotate_tracker = 0; /* Akk: Variable used to track how long the mouse has been panning so we don't update cursor */

    animate();
}

function animate()
{
    animationid = requestAnimationFrame( animate );

    var delta = clock.getDelta();
    controls.update( delta );
    renderer.render( scene, camera );
    framecount++;
}

function procData(d)
{
    var pts = d.split("|", 3);
    var dtype = pts[0];
    var count = pts[1]
    var data = "";

    if(pts.length > 2)
    {
        data = pts[2].toString();
    }

    switch(dtype)
    {
        case "ZONELIST":
            requests.zonelist = 0;
            updateZonelist(data);
            break;

        case "SPAWNLIST":
            requests.spawns = 0;
            updateSpawns(data, count);
            break;

        case "GRIDLIST":
            requests.grids = 0;
            updateGrids(data, count);
            break;

        case "SPAWNSAVE":
            var spret = JSON.parse(data);
            var sgid = Z.spawn2[count].spawngroupID;
            Z.spawn2[count].x = spret.x;
            Z.spawn2[count].y = spret.y;
            Z.spawn2[count].z = spret.z;
            Z.spawn2[count].heading = spret.heading;
            Z.spawngroup[sgid].name = spret.name;
            setSaved(res.spawns[count]);
            renderSpawnList();
            log("Spawn Saved: " + count);
            break;

        case "GRIDSAVE":
            var gret = JSON.parse(data);
            var gid = gret.id2;
            Z.grid_entries[count][gid].x = gret.x;
            Z.grid_entries[count][gid].y = gret.y;
            Z.grid_entries[count][gid].z = gret.z;
            Z.grid_entries[count][gid].heading = gret.heading;
            setSaved(res.grids[count][gid]);
            renderGridList();
            log("Grid Entry Saved: " + count + "-" + gid);
            break;

        case "FORMSAVE":
            var fret = JSON.parse(data);
            //log("Element Saved. " + fret.form);
            $("#"+fret.form).css("background-color", "#55FF55");
            break;

        case "ADDGRID":
            var newid = count;
            var gdata = JSON.parse(data);
            log("Added grid: " + newid + " for spawn " + gdata.sid);
            Z.grids[newid] = gdata.grid;
            Z.grid_entries[newid] = {};
            Z.spawn2[gdata.sid].pathgrid = newid;
            renderGridList();
            setTarget("spawn", gdata.sid, -1, res.spawns[gdata.sid]);
            break;

        case "ADDGRIDENTRY":
            var newnum = count;
            var gedata = JSON.parse(data);
            Z.grid_entries[gedata.grid_entry.gridid][newnum] = gedata.grid_entry;

            var lnum = false;
            if(gedata.lastnum > -1) { lnum = gedata.lastnum; }

            drawGrid(gedata.grid_entry.gridid, gedata.grid_entry.number, lnum);
            renderGridList();
            setTarget("spawn", user.lastspawn, -1, res.spawns[user.lastspawn]);
            break;

        case "SEARCH":
            //In this case count is the search type
            showSearch(data, count);
            break;

        case "ADDSPAWNGROUP":
            var spret = JSON.parse(data);
            Z.spawn2[spret.newspawn2.id] = spret.newspawn2;
            drawSpawn(spret.newspawn2.id);
            renderSpawnList();
            log("Added new spawn: " + spret.newspawn2.id + " with SG: " + spret.sgid);
            break;

        case "NEWSPAWNGROUP":
            var spret = JSON.parse(data);
            Z.spawn2[spret.newspawn2.id] = spret.newspawn2;
            Z.spawngroup[spret.newspawn2.spawngroupID] = spret.newsg;
            Z.spawnentry[spret.newspawn2.spawngroupID] = spret.newse;
            drawSpawn(spret.newspawn2.id);
            renderSpawnList();
            log("Created new spawn: " + spret.newspawn2.id + " with new SG: " + spret.newsgid);
            break;

        default:
            alert(d);
            break;
    }
}

function updateZonelist(d)
{
    var zonelist = JSON.parse(d);

    var content = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";
    var cols = ["bgcolor=#FFFFFF", "bgcolor=#CCCCCC"];
    var c = 0;

    zonedata = {};
    for(var x = 0; x < zonelist.length; x++)
    {
        var zd = zonelist[x];
        zonedata[zd.short_name] = zonelist[x];

        content += "<tr><td " + cols[c] + ">" + zd.short_name + "</td><td " + cols[c] + ">" + zd.long_name + "</td><td " + cols[c] + ">";
        if(zd.file_exists)
        {
            //List zones we have maps for for the input box
            znames.push(zd.short_name);

            content += "<button type=button onClick='loadZone(\"" + zd.short_name + "\");'>Load</button>";
        }
        else
        {
            content += "No File!";
        }
        content += "</td></tr>";
        c++;
        if(c > 1) { c = 0; }
    }
    content += "</table>";

    $("#zselect").w2field("combo", { items: znames, match: "contains", onRequest: function() { alert("request"); }, onChange: function() { alert("change"); } });
    $("#zonecontent").html(content);
	
	/* Load From GET */
	//if(typeof(load_from_get) != "undefined" && load_from_get){ loadZone(load_from_get, 1); }
	if(load_from_get) { loadZone(load_from_get, 1); }
}

function updateGrids(d, gridcount)
{
    var griddata = JSON.parse(d);
    log("Grids: " + gridcount);

    for(var x in res.grids)
    {
        for(var y in res.grids[x])
        {
            //scene.remove(res.grids[x][y]);
            hitscene.remove(res.grids[x][y]);
            res.grids[x][y].remove(res.grids[x][y].userData.hmesh);
            if(res.grids[x][y].userData.lastline)
            {
                scene.remove(res.grids[x][y].userData.lastline);
                res.grids[x][y].userData.lastlineg.dispose();
            }
        }
    }

    res.grids = {};

    Z.grids = griddata.grids;
    Z.grid_entries = griddata.grid_entries;

    var lastg;

    for(var x in Z.grids)
    {
        lastg = false;
        for(var y in Z.grid_entries[x])
        {
            drawGrid(x, y, lastg);
            lastg = y;
        }
    }
    renderGridList();
}

function drawGrid(gid, geid, lastg)
{
    var x = gid;
    var y = geid;

    var grid = Z.grid_entries[x][y];

    if(!res.grids[x]) { res.grids[x] = {}; }

    res.grids[x][y] = new THREE.Mesh( res.cube, res.gridmat );
    res.grids[x][y].scale.set(0.5, 0.5, 0.5);
    res.grids[x][y].position.set( grid.x, grid.y, grid.z * -1);

    //Max heading value is 255.
    res.grids[x][y].rotation.z = toRad( Math.abs(360 - fromEQ(parseFloat(grid.heading))) );

    res.grids[x][y].userData.lastline = false;
    res.grids[x][y].userData.lastlineg = false;

    res.grids[x][y].userData.nextGrid = -1;
    res.grids[x][y].userData.prevGrid = -1;

    if(lastg)
    {
        var lgrid = Z.grid_entries[x][lastg];
        res.grids[x][y].userData.lastlineg = new THREE.Geometry();
        res.grids[x][y].userData.lastlineg.vertices.push( new THREE.Vector3(grid.x, grid.y, grid.z * -1) );
        res.grids[x][y].userData.lastlineg.vertices.push( new THREE.Vector3(lgrid.x, lgrid.y, lgrid.z * -1) );
        res.grids[x][y].userData.lastline = new THREE.Line(res.grids[x][y].userData.lastlineg, res.linemat);
        res.grids[x][y].userData.lastline.visible = false;
        res.grids[x][y].userData.lastline.userData.objtype = "gridline";

        //Set up links so we can easily traverse from a given target.
        res.grids[x][lastg].userData.nextGrid = y;
        res.grids[x][y].userData.prevGrid = lastg;

        scene.add(res.grids[x][y].userData.lastline);
    }

    res.grids[x][y].userData.hmesh = new THREE.Line(res.hline, res.linemat);
    res.grids[x][y].userData.hmesh.position.set( 0, 0, 0);
    res.grids[x][y].userData.hmesh.rotation.set( 0, 0, 0);
    res.grids[x][y].userData.hmesh.userData.objtype = "heading";

    res.grids[x][y].userData.objtype = "grid";
    res.grids[x][y].userData.uid = x;
    res.grids[x][y].userData.entry = y;
    res.grids[x][y].userData.dirty = false;
    res.grids[x][y].add(res.grids[x][y].userData.hmesh);
    res.grids[x][y].visible = false;
    res.grids[x][y].userData.hmesh.visible = false;
    hitscene.add(res.grids[x][y]);
}

function renderGridList()
{
    var gridstr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";
    for(var x in Z.grids) // id, zoneid, type, type2
    {
        gridstr += "<tr><td class=tdul>Grid " + x + "</td><td class=tdul>" + gridtypes[Z.grids[x].type] + "</td><td class=tdul>" + pausetypes[Z.grids[x].type2] + "</td><td class=tdul><button onClick='displayGrid("+x+");'>Show</button></td></tr>";

        for(var y in Z.grid_entries[x]) // gridid, zoneid, number, x, y, z, heading, pause
        {
            var grid = Z.grid_entries[x][y];
            gridstr += "<tr><td> &nbsp; &nbsp; " + grid.number + "</td><td>" + grid.x + "," + grid.y + "," + grid.z + "</td><td colspan=2>Pause: " + grid.pause + "</td></tr>";
        }
    }

    gridstr += "</table>";
    $("#zd_grids").empty();
    $("#zd_grids").append(gridstr);
}

function updateSpawns(d, spawncount)
{
    var spawndata = JSON.parse(d);
    //log("Spawns (V"+ settings.version + "): " + spawncount);
    log("Spawns (V"+ settings.version + "): " + Object.keys(spawndata.spawn2).length);

    for(var x in res.spawns)
    {
        //scenee.remove(res.spawns[x]);
        hitscene.remove(res.spawns[x]);
        res.spawns[x].remove(res.spawns[x].userData.hmesh);
    }

    res.spawns = {};

    Z.spawn2 = spawndata.spawn2;
    Z.spawngroup = spawndata.spawngroup;
    Z.spawnentry = spawndata.spawnentry;
    Z.npc_types = spawndata.npc_types;

    for(var x in Z.spawn2)
    {
        drawSpawn(x);
    }

    renderSpawnList();
}

function drawSpawn(spid)
{
    var x = spid;

    res.spawns[x] = new THREE.Mesh( res.cube, res.spawnmat );
    res.spawns[x].position.set( Z.spawn2[x].x, Z.spawn2[x].y, Z.spawn2[x].z * -1);

    //Max heading value is 255.
    res.spawns[x].rotation.z = toRad( Math.abs(360 - fromEQ(parseFloat(Z.spawn2[x].heading))) );

    res.spawns[x].userData.hmesh = new THREE.Line(res.hline, res.linemat);
    res.spawns[x].userData.hmesh.position.set( 0, 0, 0);
    res.spawns[x].userData.hmesh.rotation.set( 0, 0, 0);
    res.spawns[x].userData.hmesh.userData.objtype = "heading";

    res.spawns[x].userData.objtype = "spawn";
    res.spawns[x].userData.uid = x;
    res.spawns[x].userData.entry = Z.spawn2[x].spawngroupID;
    res.spawns[x].userData.dirty = false;
    res.spawns[x].add(res.spawns[x].userData.hmesh);
    //scene.add(res.spawns[x]);
    hitscene.add(res.spawns[x]);
}

function renderSpawnList()
{
   var spawnstr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";

   for(var x in Z.spawn2)
   {
        var sgid = Z.spawn2[x].spawngroupID;

        //It is possible to get spawn2 entries with an empty spawngroup.
        if(!Z.spawngroup[sgid]) { continue; }

        spawnstr += "<tr><td class=tdul>" + Z.spawngroup[sgid].name + "</td><td class=tdul>" + parseFloat(Z.spawn2[x].x).toFixed(2) + ", " + parseFloat(Z.spawn2[x].y).toFixed(2) + ", " + parseFloat(Z.spawn2[x].z).toFixed(2) + "</td>";
        spawnstr += "<td class=tdul><nobr><img src=images/goto.gif title=\"Goto Spawn\" onClick='gotoObject(res.spawns[" + x + "]); setTarget(\"spawn\", " + x + ", -1, res.spawns[" + x + "]);'> ";
        spawnstr += "<img src=images/edit.gif title=\"Edit Spawn Group\" onClick='editItem(\"spawn\", { spawnid: " + sgid + "});'> ";
        spawnstr += "<img src=images/edit.gif title=\"Edit Spawn2\" onClick='editItem(\"spawn2\", { spawn2id: " + x + "});'> ";
        spawnstr += " <img src=images/add.gif onClick='addToPalette(\"spawngroup\", "+x+", -1, -1);' title='Add SpawnGroup to Palette'>";
        spawnstr += " <img src=images/delete.gif title=\"DELETE SPAWN\"></nobr></td></tr>";
        for(var y in Z.spawnentry[sgid])
        {
            var npc = Z.npc_types[Z.spawnentry[sgid][y].npcID];

            spawnstr += "<tr><td> &nbsp; &nbsp; " + npc.name + "</td><td>L" + npc.level + "</td><td align=right>";
            spawnstr += "<a href='javascript:void();' onClick='editItem(\"npcchance\", { spawnid: " + sgid + ", npcid: " + npc.id + "});'>" + Z.spawnentry[sgid][y].chance + "% </a>&nbsp; ";
            spawnstr += "<img src=images/edit.gif onClick='editItem(\"npc\", { npcid: " + npc.id + " });'>";
            spawnstr += "<img src=images/add.gif onClick='addToPalette(\"npc\", "+ npc.id + ", -1, -1);' title='Add NPC to Palette'></td></tr>";
        }
    }

    spawnstr += "</table>";
    $("#zd_spawns").empty();
    $("#zd_spawns").append(spawnstr);
}

function startText()
{
    if(!controls) { return; }
    controls.pause = true;
}

function endText()
{
    if(!controls) { return; }
    controls.pause = false;
}

function keyProc(e)
{
    if(controls.pause) { return; }

    var key = e.keyCode || e.charCode;
    switch(key)
    {
        case 107:
        case 43: speedUp(); break;

        case 109:
        case 45: speedDown(); break;

        default:
            break;
    }
}

/* Master Mouse Move Parsed Event
	Triggers on every single pixel move of the mouse
	- Parent of moving object functions
*/
function mouseMove(e)
{
    mousepos.movex = e.clientX;
    mousepos.movey = e.clientY;

	// console.log(opmode);
    if(opmode.substr(0, 7) == "MOVEOBJ")
    {
        var dir = opmode.substr(7, 1);
        //Always use the X axis?
        var mdist = mousepos.movex - mousepos.x;
        if(dir == 'h')
        {
            var fdir = toDeg(parseFloat(moverpos[dir])) - parseFloat(mdist);
            if(fdir > 359) { fdir = 359; }
            if(fdir < 0) { fdir = 0; }
            user.curobject.rotation.z = toRad(fdir);
        }
        else
        {
            user.curobject.position[dir] = parseFloat(moverpos[dir]) - parseFloat(mdist/10);
        }
        //log(mdist + " - " + dir + " - " + user.curobject.position[dir]);
        updateSelPos();
    }
}

function speedUp()
{
    if(controls.movementSpeed < 2000) { controls.movementSpeed += 5; }
    log("Move Speed: " + controls.movementSpeed);
}

function speedDown()
{
    if(controls.movementSpeed > 5) { controls.movementSpeed -= 5; }
    log("Move Speed: " + controls.movementSpeed);
}

/* Responsible for updating Camera Frames Per Second */
function updateFPS()
{
    $("#info").empty();
    $("#info").append( "FPS: " + framecount.toString() + " POS: " + camera.position.x.toFixed(2) + " : " + camera.position.y.toFixed(2) + " : " + camera.position.z.toFixed(2));

    if(window.performance.memory)
    {
        var memstr = "Memory Usage: " + window.performance.memory.usedJSHeapSize + " / " + window.performance.memory.jsHeapSizeLimit;
        $("#meminfo").empty();
        $("#meminfo").append(memstr);
    }
    framecount = 0;
}

/* Loading Zone functions 
	load_method - used as a status variable as to how to load the zone
		1 = Loading from GET URL passing
*/
function loadZone(zn, load_method)
{
	load_method = typeof load_method !== 'undefined' ? load_method : 0;

    if(loading) { log("Load in progress, ignoring new load request."); return; }
    loader.load( "mapjs/s_"+zn+".js" , function( result ) { loadFinished( result ); } );
    $("#zonemenu").dialog('close');
    //$("#load").show();
    $("#zlbutton").empty();
    $("#zlbutton").append("Zone List (Loading: " + zn + ")");
	
    // Akka: Loader
	$( "#big_loader" ).fadeIn( "slow");
	$( "#big_loader" ).html('<i class="fa-li fa fa-refresh fa-spin glow" style="font-size:2000%;position:absolute; z-index:999999999px !important;top:20%;left:33%;"></i>');
	
	$( "#big_loader_text" ).fadeIn( "slow");
	$( "#big_loader_text" ).html('<h4 class="glow" style="font-size:500%;position:absolute; z-index:99999px !important;top:38%;left:36%;text-align:center">Loading <br>' + zn + '<br> please wait...</h4>');
	
    loading = true;
    currentzone = zn;
	
	/* Update Page Title */
	$(document).attr('title', '[EQEmu Map Tool] (' + zn + ')');
	
	/* Akk: Only push new browser variables if we're loading from the zone selection menu... */
	if(load_method != 1)
    {
		history.pushState("page_pop", '?zone=' + zn, '?zone=' + zn);
	}
	
    //Cleanup
/*
    for(var n in res.materials)
    {
        res.materials[n].dispose();
    }
    res.materials = {};

    for(var n in res.textures)
    {
        res.textures[n].dispose();
    }
    res.textures = {};
*/

    for(var n in res.objects)
    {
        //Sceneroot persists but regular map objects are loaded into it.
        sceneroot.remove( res.objects[n] );
        for(var i in res.objects[n].children)
        {
            res.objects[n].children[i].deallocate();
            renderer.deallocateObject( res.objects[n].children[i] );
        }
    }
    res.objects = {};

    for(var n in res.geometries)
    {
        res.geometries[n].dispose();
    }
    res.geometries = {};

    res.mover.traverse( function(child) { child.visible = false; } );
    clearTarget();

    tracker.unsaved = [];
    tracker.npcs = [];
    tracker.spawngroups = [];

    updateUnsaved();
    updatePalette();

    getZoneData();

    //getSpawns();
    //getGrids();
}

function loadFinished(result)
{
    loading = false;
    $("#load").hide();

    for(var n in result.textures)
    {
        res.textures[n] = result.textures[n];
    }

    for(var n in result.materials)
    {
        res.materials[n] = result.materials[n];
    }

    for(var n in result.geometries)
    {
        res.geometries[n] = result.geometries[n];
    }

    for(var n in result.objects)
    {
        res.objects[n] = result.objects[n];
        res.objects[n].userData.objtype = "map";
        res.objects[n].material = mapmats[settings.mapmat];

        sceneroot.add(res.objects[n]);
    }

    log("Loaded zone: " + currentzone + "<br>Safe Coords: " + zonedata[currentzone].safe_x + ", " + zonedata[currentzone].safe_y + ", " + zonedata[currentzone].safe_z);

    $("#zlbutton").empty();
    $("#zlbutton").append("Zone List (" + currentzone + ")");
	
	// Akka: Loader Complete - Wipe
	$( "#big_loader" ).fadeOut('fast');
	$( "#big_loader" ).html('');

	$( "#big_loader_text" ).fadeOut('fast');
	$( "#big_loader_text" ).html('');

    camera.position.set( parseFloat(zonedata[currentzone].safe_x), parseFloat(zonedata[currentzone].safe_y), parseFloat(zonedata[currentzone].safe_z) * -1);
    camera.up.set ( 0, 0, -1 );
    camera.lookAt( new THREE.Vector3(1, 0, 0) );
}

/* LoadProgress - Primarily currently used for zone loading status */
function loadProgress(item, loaded, total)
{
    $("#load").empty();
    $("#load").append("Loading: " + item);
}
/* End loading functions */

/* Log Function, uses the #statustext element, currently in a movable status box... */
function log(m)
{
    $("#statustext").prepend(m+"<hr>");
}

function updateSettings()
{
    var ov = settings.version;
    settings.movespeed = $(document.forms['settingsform'].s_speed).val();
    settings.version = $(document.forms['settingsform'].s_version).val();
    settings.spawntime = $(document.forms['settingsform'].s_spawntime).val();
    settings.spawnvariance = $(document.forms['settingsform'].s_spawnvariance).val();

    settings.mapmat = $('input[name=s_mapmat]:checked').val();

    if(ov != settings.version)
    {
        //getSpawns();
        getZoneData();
    }

    controls.movementSpeed = settings.movespeed;
    log("Move Speed: " + settings.movespeed);

    for(var x in res.objects)
    {
        res.objects[x].material = mapmats[settings.mapmat];
    }
}

function selToZ()
{
    if(user.curobject)
    {
        var hitz = getZ(user.curobject);
        if(hitz === false) { return; }
        user.curobject.position.z = hitz - 5;
        res.mover.position.set( user.curobject.position.x, user.curobject.position.y, user.curobject.position.z );
        setEdited(user.curobject);
        updateSelPos();
    }
}

function getZ(obj)
{
    //Somewhere we're getting non-numeric values in obj.position
    var ray = new THREE.Raycaster( new THREE.Vector3( parseFloat(obj.position.x), parseFloat(obj.position.y), parseFloat(obj.position.z) ), new THREE.Vector3(0, 0, 1), 0, 10000);
    var hits = ray.intersectObject( sceneroot, true );
    if(hits.length > 0) { return(hits[0].point.z); }
    else { return(false); }
}


/* updateCursor - Responsible for updating coordinates of selection on 'Click' event, dispatched by master jquery event */

function updateCursor()
{	
    if(opmode.substr(0, 7) == "MOVEOBJ")
    {
        opmode = "NAVIGATE";
        res.mover.position.set( user.curobject.position.x, user.curobject.position.y, user.curobject.position.z );
        //Set position callback with current coords
        //log("Stopped moving object.");
        return;
    }

    var svx = ( mousepos.x / window.innerWidth ) * 2 - 1;
    var svy = -( mousepos.y / window.innerHeight ) * 2 + 1;
    var svec = new THREE.Vector3( svx, svy, 1);

    var projector = new THREE.Projector();    
    projector.unprojectVector( svec, camera );

    var ray = new THREE.Raycaster( camera.position, svec.sub(camera.position).normalize(), 0, 10000);
    //var hits = ray.intersectObjects( scene.children, true);
    var hits = ray.intersectObjects( hitscene.children, true);

    var hx = -1;
    if(hits.length > 0)
    {
        //Test object visibility - We could also test object type here for exclusions or specific modes.
        for(hc = 0; hc < hits.length; hc++)
        {
            if(hits[hc].object.visible && hits[hc].object.userData.objtype != 'heading' && hits[hc].object.userData.objtype != 'gridline') { hx = hc; break; }
        }

        if(hx < 0) { return; }

        var hitmap = false;
        switch(hits[hx].object.userData.objtype)
        {
            case "map":
                user.cursor.position = hits[hx].point;
                hitmap = true;				
                break;

            case "spawn":
                setTarget("spawn", hits[hx].object.userData.uid, -1, hits[hx].object);
                break;

            case "grid":
                setTarget("grid", hits[hx].object.userData.uid, hits[hx].object.userData.entry, hits[hx].object);
                break;

            case "movex":
            case "movey":
            case "movez":
            case "moveh":
				
                opmode = "MOVEOBJ" + hits[hx].object.userData.objtype.substr(4, 1);
				
                //log("Moving object in mode " + opmode);
                moverpos.x = user.curobject.position.x;
                moverpos.y = user.curobject.position.y;
                moverpos.z = user.curobject.position.z;
                moverpos.h = user.curobject.rotation.z;
                //TODO: Mark the object as edited.
                setEdited(user.curobject);
                return;
                break;

            default:
                break;
        }
        user.lastdist = user.curdist;
        user.curdist = hits[hx].distance;
    }
	
	
}

function editSel()
{
    if(user.curobject && user.curobject.userData.objtype != "map")
    {
        var dt = {};
        switch(user.curtype)
        {
            case "spawn":
                dt.spawnid = Z.spawngroup[user.curobject.userData.uid].id;
                break;

            default:
                return;
        }

        editItem(user.curtype, dt);
    }
}

function editItem(tp, data)
{
    if(!tp || !data) { return; }

    //log("Edit: " + tp + "-" + id);

    var page = _c.datatypes[tp].edit;

    data.zonesn = currentzone;
    data.zoneid = zonedata[currentzone].id;
    data.zoneidnumber = zonedata[currentzone].zoneidnumber;

    for(var x in data)
    {
        //Replace only works once unless the regex is literal.  This is hackish but oh well.
        page = page.replace("%%"+x+"%%", data[x]);
        page = page.replace("%%"+x+"%%", data[x]);
        page = page.replace("%%"+x+"%%", data[x]);
    }

    $('#editframe').attr('src', page);
    if(!$('#editor').dialog("isOpen")) { $('#editor').dialog("open"); }
    $('#editor').dialog("moveToTop");
}

function setTarget(tp, id1, id2, obj)
{
    if(user.curobject.material && user.curobject.userData.objtype != "map") { user.curobject.material = objmats[user.curobject.userData.objtype].standard; }
    obj.material = objmats[tp].selected;

    user.lastobject = user.curobject;
    user.curobject = obj;
    user.curtype = tp;

    res.mover.position.set( obj.position.x, obj.position.y, obj.position.z );
    res.mover.traverse( function(child) { child.visible = true; } );

    //TODO: Set up a template system by type

    switch(tp)
    {
        case "spawn":
            var infostr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";
            var sgid = Z.spawn2[id1].spawngroupID;
            var pathid = Z.spawn2[id1].pathgrid;

            user.lastspawn = id1;

            for(var x in Z.spawnentry[sgid])
            {
                var npc = Z.npc_types[Z.spawnentry[sgid][x].npcID];
                infostr += "<tr><td><a href='javascript:void(0);' onClick='editQuest(" + npc.id + ");'>" + npc.name + "</a></td><td>L" + npc.level + "</td><td align=right>";
                //infostr += "<a href='javascript:void();' onClick='editItem(\"npcchance\", { spawnid: " + sgid + ", npcid: " + npc.id + "});'>"+ Z.spawnentry[sgid][x].chance + "% </a>&nbsp; ";
                var fmid = "fm_spawnchance_"+sgid+"-"+x+"-"+npc.id;
                infostr += "<input id="+fmid+" type=text size=3 class=fm_field onChange='";
                infostr += "saveForm(this, { fmtype: \"spawnchance\", spawnid: " + sgid + ", entryid: " + x + ", npcid: " + npc.id + "});' value=\"" + Z.spawnentry[sgid][x].chance + "\">%&nbsp; ";
                infostr += "<img src=images/edit.gif onClick='editItem(\"npc\", { npcid: " + npc.id + " });' title='Edit NPC'>";
                infostr += "<img src=images/add.gif onClick='addToPalette(\"npc\", " + npc.id + ", " + id1 + ", " + x + ");' title='Add NPC to Palette'></td></tr>";
            }
            infostr += "</table>";
            $("#sel_info").empty();
            $("#sel_info").append(infostr);
        
            $("#sel_heading").empty();
            var spawnstr = "<b>" + tp + ": <input type=text name='selname' id='selname' value='' size=15></b>";
            spawnstr += "<img src=images/goto.gif title=\"Go to spawn\" onClick='gotoObject(res.spawns[" + id1 + "]);'>";
            spawnstr += "<img src=images/edit.gif title=\"Edit Spawn Group\" onClick='editItem(\"spawn\", { spawnid: " + sgid + "});'>";
            spawnstr += "<img src=images/edit.gif title=\"Edit Spawn2\" onClick='editItem(\"spawn2\", { spawn2id: " + id1 + "});'>";
            spawnstr += "<img src=images/add.gif onClick='addToPalette(\"spawngroup\", " + id1 + ", -1, -1);' title='Add SpawnGroup to Palette'><br>";
            spawnstr += "Path Grid: " + pathid;

            if(pathid > 0)
            {
                spawnstr += "<br>Type: <select name=gridtype id='fm_gridtype_"+pathid+"' onChange='saveForm(this, { fmtype: \"gridtype\", gid: "+pathid+", znum: "+zonedata[currentzone].zoneidnumber+"});'>";
                spawnstr += "<option value=" + Z.grids[pathid].type + ">" + gridtypes[Z.grids[pathid].type] + "</option>";
                for(var i in gridtypes)
                {
                    if(i == Z.grids[pathid].type) { continue; }
                    spawnstr += "<option value="+i+">"+gridtypes[i]+"</option>";
                }
                spawnstr += "</select><br>Pause: <select name=pausetype id='fm_pausetype_"+pathid+"' onChange='saveForm(this, { fmtype: \"pausetype\", gid: "+pathid+", znum: "+zonedata[currentzone].zoneidnumber+"});'>";
                spawnstr += "<option value=" + Z.grids[pathid].type2 + ">" + pausetypes[Z.grids[pathid].type2] + "</option>";
                for(var i in pausetypes)
                {
                    if(i == Z.grids[pathid].type2) { continue; }
                    spawnstr += "<option value="+i+">"+pausetypes[i]+"</option>";
                }
                spawnstr += "</select>";
            }
            else
            {
                spawnstr += "<button type=button onClick='createGrid("+id1+");'>Create Grid</button>";
            }
            spawnstr += "<hr>";
            $("#sel_heading").append( spawnstr );
            $("#selname").val(Z.spawngroup[sgid].name);

/*
            //Set up a list of grids for traversal, hide and show accordingly.
            var gridstr = "";
            for(var x in Z.grids)
            {
                for(var y in Z.grid_entries[x])
                {
                    if(x == pathid && pathid != 0)
                    {
                        res.grids[x][y].visible = true;
                        res.grids[x][y].userData.hmesh.visible = true;
                        res.grids[x][y].userData.lastline.visible = true;
                        var iid = "fm_gridpause_" + x + "-" + y;
                        gridstr += "<div><img src=images/goto.gif title=\"Go to grid\" onClick='gotoObject(res.grids["+x+"]["+y+"]);'> ";
                        gridstr += "Pause: <input id='"+iid+"' class='fm_field' type=text size=2 value='" + Z.grid_entries[x][y].pause + "' onChange='saveForm(this, { fmtype: \"gridpause\", id1: "+x+", id2: "+y+", znum: "+zonedata[currentzone].zoneidnumber+"});'> Grid " + x + "-" + y + "</div>";
                    }
                    else
                    {
                        res.grids[x][y].visible = false;
                        res.grids[x][y].userData.hmesh.visible = false;
                        res.grids[x][y].userData.lastline.visible = false;
                    }
                }
            }
            $("#sel_extra").empty();
            $("#sel_extra").append(gridstr);
*/
            displayGrid(pathid);
            break;

        case "grid":
            user.lastgrid = id1;
            break;
    }
        
    updateSelPos();
}

function displayGrid(pathid)
{
            var gridstr = "";
            for(var x in Z.grids)
            {
                for(var y in Z.grid_entries[x])
                {
                    if(x == pathid && pathid != 0)
                    {
                        res.grids[x][y].visible = true;
                        res.grids[x][y].userData.hmesh.visible = true;
                        res.grids[x][y].userData.lastline.visible = true;
                        var iid = "fm_gridpause_" + x + "-" + y;
                        gridstr += "<div><img src=images/goto.gif title=\"Go to grid\" onClick='gotoObject(res.grids["+x+"]["+y+"]);'> ";
                        gridstr += "Pause: <input id='"+iid+"' class='fm_field' type=text size=2 value='" + Z.grid_entries[x][y].pause + "' onChange='saveForm(this, { fmtype: \"gridpause\", id1: "+x+", id2: "+y+", znum: "+zonedata[currentzone].zoneidnumber+"});'> Grid " + x + "-" + y + "</div>";
                    }
                    else
                    {
                        res.grids[x][y].visible = false;
                        res.grids[x][y].userData.hmesh.visible = false;
                        res.grids[x][y].userData.lastline.visible = false;
                    }
                }
            }
            $("#sel_extra").empty();
            $("#sel_extra").append(gridstr);
}

function clearTarget()
{
    if(user.curobject.material && user.curobject.userData.objtype != "map") { user.curobject.material = objmats[user.curobject.userData.objtype].standard; }

    res.mover.traverse( function(child) { child.visible = false; } );

    user.lastobject = user.curobject;
    user.curobject = "";
    user.curtype = "";

    for(var x in Z.grids)
    {
        for(var y in Z.grid_entries[x])
        {
            res.grids[x][y].visible = false;
            res.grids[x][y].userData.hmesh.visible = false;
            res.grids[x][y].userData.lastline.visible = false;
        }
    }

    $("#sel_info").empty();
    $("#sel_heading").empty();
    $("#sel_extra").empty();
    $("#selx").html( "0" );
    $("#sely").html( "0" );
    $("#selz").html( "0" );
    $("#selh").html( "0" );
}

function updateSelPos()
{
    if(user.curobject)
    {
        $("#selx").html( parseFloat(user.curobject.position.x).toFixed(2) );
        $("#sely").html( parseFloat(user.curobject.position.y).toFixed(2) );
        $("#selz").html( parseFloat(user.curobject.position.z).toFixed(2) );
        $("#selh").html( toEQ( 360 - toDeg(parseFloat(user.curobject.rotation.z)) ).toFixed(2) );
    }

    if(user.curtype == "grid")
    {
        updateGridLines(user.curobject.userData.uid, user.curobject.userData.entry);
    }
}

function updateGridLines(gx, gy)
{
    //var grid = Z.grid_entries[gx][gy];
    var grid = res.grids[gx][gy].position;

    if(res.grids[gx][gy].userData.prevGrid != -1)
    {
        //var lgrid = Z.grid_entries[gx][res.grids[gx][gy].prevGrid];
        var lgrid = res.grids[gx][res.grids[gx][gy].userData.prevGrid].position;
        var active = res.grids[gx][gy];

        //log(res.grids[gx][gy].userData.prevGrid);
        //log(lgrid.x + "-"+lgrid.y+"-"+lgrid.z);
        //log(user.curobject.position.x+"-"+user.curobject.position.y+"-"+user.curobject.position.z);
        active.userData.lastline.geometry.vertices[0].x = parseFloat(lgrid.x);
        active.userData.lastline.geometry.vertices[0].y = parseFloat(lgrid.y);
        active.userData.lastline.geometry.vertices[0].z = parseFloat(lgrid.z);
        active.userData.lastline.geometry.vertices[1].x = parseFloat(user.curobject.position.x);
        active.userData.lastline.geometry.vertices[1].y = parseFloat(user.curobject.position.y);
        active.userData.lastline.geometry.vertices[1].z = parseFloat(user.curobject.position.z);
        active.userData.lastline.geometry.verticesNeedUpdate = true;
    }

    if(res.grids[gx][gy].userData.nextGrid != -1)
    {
        //var ngrid = Z.grid_entries[gx][res.grids[gx][gy].userData.nextGrid];
        var ngrid = res.grids[gx][res.grids[gx][gy].userData.nextGrid].position;
        var active = res.grids[gx][res.grids[gx][gy].userData.nextGrid];

        active.userData.lastline.geometry.vertices[0].x = parseFloat(ngrid.x);
        active.userData.lastline.geometry.vertices[0].y = parseFloat(ngrid.y);
        active.userData.lastline.geometry.vertices[0].z = parseFloat(ngrid.z);
        active.userData.lastline.geometry.vertices[1].x = parseFloat(user.curobject.position.x);
        active.userData.lastline.geometry.vertices[1].y = parseFloat(user.curobject.position.y);
        active.userData.lastline.geometry.vertices[1].z = parseFloat(user.curobject.position.z);
        active.userData.lastline.geometry.verticesNeedUpdate = true;
    }
}

function gotoObject(obj)
{
    if(obj.position)
    {
        camera.position.set( parseFloat(obj.position.x), parseFloat(obj.position.y), parseFloat(obj.position.z - 40) );
        camera.lookAt(obj.position);
    }
}

function selToCursor()
{
    if(user.curobject && user.curobject != "")
    {
        var zoffset = getZOffset(user.curobject, user.curtype);

        user.curobject.position.set( user.cursor.position.x, user.cursor.position.y, user.cursor.position.z + zoffset );
        res.mover.position.set( user.cursor.position.x, user.cursor.position.y, user.cursor.position.z + zoffset );
        updateSelPos();
        //Call immediate save?
		saveSelPos(); //Akka
    }
}

function cursorToSel()
{
    if(user.curobject && user.curobject != "")
    {
        user.cursor.position.set( user.curobject.position.x, user.curobject.position.y, user.curobject.position.z );
    }
}

function getZOffset(obj, type)
{
    //Figure this out by type, npc model, size, etc.
    //Cursor is USUALLY at a hit plane, but not always!
    return(-5);
}

function saveSelPos()
{
    var active = 0;
    var savedest = "";
    if(user.curobject)
    {
        switch(user.curtype)
        {
            case "spawn":
                active = res.spawns[user.curobject.userData.uid];
                savedest = _c.datatypes.spawn.save;
                break;

            case "grid":
                active = res.grids[user.curobject.userData.uid][user.curobject.userData.entry];
                savedest = _c.datatypes.grid.save;
                break;

            default:
                break;
        }

        if(active)
        {
            var spdata = {};
            spdata.heading = toEQ(360 - toDeg(active.rotation.z)).toFixed(2);
            spdata.x = active.position.x;
            spdata.y = active.position.y;
            spdata.z = active.position.z * -1;
            spdata.objname = $("#selname").val();
            spdata.type = user.curtype;
            spdata.id = user.curobject.userData.uid;
            spdata.id2 = user.curobject.userData.entry;
            spdata.znum = zonedata[currentzone].zoneidnumber;
            spdata.zid = zonedata[currentzone].id;
            //log("Save Object: " + user.curtype + "-" + active.position.x + ", " + active.position.y + ", " + active.position.z + ", " + fixedhead );
            $.post(savedest, spdata, function(data) { procData(data); });
        }
    }
}

function resetSelPos()
{
    var active = 0;
    if(user.curobject)
    {
        switch(user.curtype)
        {
            case "spawn":
                active = Z.spawn2[user.curobject.userData.uid];
                break;

            case "grid":
                active = Z.grid_entries[user.curobject.userData.uid][user.curobject.userData.entry];
                break;

            default:
                break;
        }

        if(active)
        {
            user.curobject.position.set( active.x, active.y, active.z * -1);
            user.curobject.rotation.z = toRad(360 - fromEQ(parseFloat(active.heading)));
            res.mover.position.set( active.x, active.y, active.z * -1);
            setSaved(user.curobject);
            if(user.curtype == "grid") { updateGridLines(user.curobject.userData.uid, user.curobject.userData.entry); }
        }
    }
}

function ToggleHEdit()
{
    if(opmode == "MOVEOBJh")
    {
        opmode = "";
        saveSelPos();
    }
    else
    {
        if(!user.curobject || user.curtype == "map" || !user.curtype) { return; }
        opmode = "MOVEOBJh";
        moverpos.x = user.curobject.position.x;
        moverpos.y = user.curobject.position.y;
        moverpos.z = user.curobject.position.z;
        moverpos.h = user.curobject.rotation.z;
        setEdited(user.curobject);
    }
}

function addToPalette(type, data)
{
    switch(type)
    {
        case "npc":
            tracker.npcs.push(data);
            updatePalette();
            break;

        case "spawngroup":
            tracker.spawngroups.push(data);
            updatePalette();

        default:
            break;
    }
}

function setEdited(obj)
{
    var tinfo = {};

    if(obj.userData.dirty) { return; }

    tinfo.ref = obj;
    tinfo.id = obj.userData.uid;
    tinfo.sid = obj.userData.entry;
    tinfo.type = obj.userData.objtype;

    obj.userData.dirty = true;
    tracker.unsaved.push(tinfo);

    updateUnsaved();
}

function setSaved(obj)
{
    //Certain operations are immediate so the object never gets set dirty.
    if(!obj.userData.dirty) { return; }

    var fnd = -1;
    for(var x = 0; x < tracker.unsaved.length; x++)
    {
        if(tracker.unsaved[x].ref === obj)
        {
            fnd = x;
            break;
        }
    }

    obj.userData.dirty = false;
    if(fnd < 0) { log("Object not found!"); return; }

    tracker.unsaved.splice(fnd, 1);
    updateUnsaved();
}

function updateUnsaved()
{
    var ustr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";

    for(var x = 0; x < tracker.unsaved.length; x++)
    {
        var o = tracker.unsaved[x];
        ustr += "<tr><td>" + o.type + "</td><td>" + o.id;
        if(o.sid >= 0) { ustr += " - " + o.sid; }
        ustr += "</td><td align=right><nobr>";
        ustr += "<image src=images/delete.gif title='Reset Position' alt='Reset Position' onClick='setTarget(\""+o.type+"\", "+o.id+", "+o.sid+", tracker.unsaved["+x+"].ref); resetSelPos(); '>&nbsp;";
        ustr += "<img src=images/goto.gif title='Go To Object' alt='Go To Object' onClick='setTarget(\""+o.type+"\", "+o.id+", "+o.sid+", tracker.unsaved["+x+"].ref); gotoObject(tracker.unsaved["+x+"].ref);'>&nbsp;";
        ustr += "<img src=images/save.gif title='Save Object' alt='Save Object' onClick='setTarget(\""+o.type+"\", "+o.id+", "+o.sid+", tracker.unsaved["+x+"].ref); saveSelPos(); '>";
        ustr += "</nobr></td></tr>";
    }
    ustr += "</table>";

    $("#c_unsaved").empty();
    $("#c_unsaved").append(ustr);
}

function updatePalette()
{
    var pstr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";

    for(var x = 0; x < tracker.npcs.length; x++)
    {
        var npc = Z.npc_types[tracker.npcs[x]];
        var ckstr = "";
        if($("#pc_npc_"+x).is(':checked')) { ckstr = " checked"; }
        pstr += "<tr><td>" + npc.name + "</td><td>" + npc.level + "</td>";
        pstr += "<td align=right><input type=text id='pc_chance_"+x+"' size=2 value=0>% ";
        pstr += "<input type=checkbox class='pcheck pc_npc' id='pc_npc_"+x+"' onClick='pSelect(\"npc\", "+x+", this);'" + ckstr + "> ";
        pstr += "<img src=images/delete.gif onClick='delFromPalette(\"npc\", "+x+");' title='Remove From Palette' alt='Remove From Palette'></td>";
        pstr += "</tr>";
    }

    pstr += "<tr><td colspan=3><hr></td></tr>";

    var sgsel = $('input[name=sgselect]:checked').val();
    for(var x = 0; x < tracker.spawngroups.length; x++)
    {
        var sp2 = tracker.spawngroups[x];
        var sgid = Z.spawn2[sp2].spawngroupID;
        var sg = Z.spawngroup[sgid];
        var ckstr = "";
        if(x == sgsel) { ckstr = " checked"; }
        pstr += "<tr><td>" + sg.name + "</td>";
        pstr += "<td><img src=images/goto.gif title=\"Goto Spawn\" onClick='gotoObject(res.spawns[" + sp2 + "]); setTarget(\"spawn\", " + sp2 + ", -1, res.spawns[" + sp2 + "]);'></td>";
        //pstr += "<td align=right><input type=checkbox class='pcheck pc_spawngroup' id='pc_spawngroup_"+x+"' onClick='pSelect(\"spawngroup\", "+x+", this);'> ";
        pstr += "<td align=right><input type=radio class='pradio' name=sgselect value='"+x+"' onClick='pSelect(\"spawngroup\", "+x+", this);'" + ckstr + "> ";
        pstr += "<img src=images/delete.gif onClick='delFromPalette(\"spawngroup\", "+x+");' title='Remove From Palette' alt='Remove From Palette'></td>";
        pstr += "</tr>";
    }

    pstr += "</table>";

    $("#c_palette").empty();
    $("#c_palette").append(pstr);
}

function pSelect(type, id, sender)
{
    switch(type)
    {
        case "npc":
            break;

        case "spawngroup":
            break;

        default:
            break;
    }
}

function delFromPalette(type, id)
{
    switch(type)
    {
        case "npc":
            tracker.npcs.splice(id, 1);
            break;

        case "spawngroup":
            tracker.spawngroups.splice(id, 1);
            break;

        default:
            break;
    }
    updatePalette();
}

function doSearch()
{
    var pd = {};
    pd.type = $("#search_type").val();
    pd.field = $("#search_field").val();
    pd.value = $("#search_value").val();

    $.post(_c.searchform, pd, function(data) { procData(data); });
}

function showSearch(d, type)
{
    var searchres = JSON.parse(d);

    var sstr = "<table border=0 cellspacing=0 cellpadding=2 width=100%>";

    //Right now we only search NPC's
    sstr += "<tr><td><b>Name</b></td><td><b>Level</b></td><td><b>ID</b></td><td>&nbsp;</td></tr>";
    for(var x in searchres)
    {
        sstr += "<tr><td>" + searchres[x].name + "</td><td>" + searchres[x].level + "</td><td>" + searchres[x].id + "</td>";
        sstr += "<td><img src=images/edit.gif onClick='editItem(\"npc\", { npcid: " + searchres[x].id + " });' title='Edit NPC'>";
        sstr += "<img src=images/add.gif onClick='addToPalette(\"npc\", " + searchres[x].id + ", -1, -1);' title='Add NPC to Palette'></td>";
        sstr += "</tr>";

        //We might eventually want to store this in a current search object and only use the persistent cache for results that get used.
        //Even if this is already there, this version should be the most current.
        Z.npc_types[searchres[x].id] = searchres[x];
        Z.npc_types[searchres[x].id].npcid = searchres[x].id;
    }
    sstr += "</table>";

    $("#zd_searchres").empty();
    $("#zd_searchres").append(sstr);
}

function addSpawngroup()
{
    var sgsel = $('input[name=sgselect]:checked').val();
    if(sgsel === undefined) { return; }

    //This is a spawn ID, NOT a spawngroup ID.
    //Once the zone data is reworked spawngroups may get their own container, but for now they are combined with spawn2 entries -- Fixed!.
    var sid = tracker.spawngroups[sgsel];

    var pdata = {};
    pdata.x = user.cursor.position.x;
    pdata.y = user.cursor.position.y;
    pdata.z = (user.cursor.position.z + getZOffset(user.cursor, "spawn")) * -1;
    pdata.sgid = Z.spawn2[sid].spawngroupID;
    pdata.sid = sid;
    pdata.zn = currentzone;
    pdata.zid = zonedata[currentzone].zoneidnumber;
    pdata.ver = settings.version;

    pdata.respawntime = settings.spawntime;
    pdata.variance = settings.spawnvariance;

    $.post(_c.ops.addspawngroup, pdata, function(data) { procData(data); });
}

function createSpawngroup()
{
    if(tracker.npcs.length < 1) { return; }

    var npclist = [];
    for(var x = 0; x < tracker.npcs.length; x++)
    {
        var npc = Z.npc_types[tracker.npcs[x]];

        if($("#pc_npc_"+x).is(':checked'))
        {
            var ch = $("#pc_chance_"+x).val();
            npclist.push( { id: tracker.npcs[x], chance: ch } );
        }
    }

    if(npclist.length < 1) { return; }

    var pdata = {};
    pdata.x = user.cursor.position.x;
    pdata.y = user.cursor.position.y;
    pdata.z = (user.cursor.position.z + getZOffset(user.cursor, "spawn")) * -1;
    pdata.zn = currentzone;
    pdata.zid = zonedata[currentzone].zoneidnumber;
    pdata.ver = settings.version;

    pdata.respawntime = settings.spawntime;
    pdata.variance = settings.spawnvariance;
    pdata.npclist = JSON.stringify(npclist);

    $.post(_c.ops.newspawngroup, pdata, function(data) { procData(data); });
}

function editQuest(npcid)
{
    var npc = Z.npc_types[npcid];

    document.getElementById('questeditframe').contentWindow[_c.questeditfunction](currentzone, npc.name);
    if(!$('#questeditor').dialog("isOpen")) { $('#questeditor').dialog("open"); }
    $('#questeditor').dialog("moveToTop");
}

function saveForm(sender, dt)
{
    var url = _c.ops.formsave;
    dt.data = $(sender).val();
    $(sender).css("background-color", "#FF5555");
    $.post(url, dt, function(data) { procData(data); });
}

function createGrid(sid)
{
    var pd = {};
    pd.znum = zonedata[currentzone].zoneidnumber;
    pd.sid = sid;
    $.post(_c.ops.addgrid, pd, function(data) { procData(data); });
}

function addGridEntry()
{
    var gid = -1;
    if(user.curtype == "grid")
    {
        gid = user.curobject.userData.uid;
    }
    if(user.curtype == "spawn")
    {
        gid = Z.spawn2[user.curobject.userData.uid].pathgrid;
    }
    if(gid < 0) { return; }

    var pdata = {};
    pdata.x = user.cursor.position.x;
    pdata.y = user.cursor.position.y;
    pdata.z = (user.cursor.position.z + getZOffset(user.cursor, "grid")) * -1;
    pdata.znum = zonedata[currentzone].zoneidnumber;
    pdata.gid = gid;

    $.post(_c.ops.addgridentry, pdata, function(data) { procData(data); });
}

function procZone()
{
    loadZone($("#zselect").val());
    return(false);
}

//TODO: Implement this.  The dodgy part is figuring out what chance to use.
//We can edit that but if we use a modular editor there is currently no way to know we need to update it.
function insertNPCS()
{
    for(var x = 0; x < tracker.npcs.length; x++)
    {
        var npc = npclist[tracker.npcs[x]];

        if($("#pc_npc_"+x).is(':checked'))
        {
            log("Insert Entry: " + npc.name);
        }
    }
}
