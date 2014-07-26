//TODO: This script needs to be loaded dynamically so that it can be managed from a login framework.

//Global Config
var _c = {};

_c.searchform = "ajax/search.php";

_c.editormain = "http://emudev.us.to/peq/";
//_c.editormain = "http://eoc.akkadius.com/AC/eoc/";

//Show the toaster popup for cursor position
_c.toaster = false;
//Play zone music if available
_c.music = false;

//These are for additive operations
_c.ops = {};
//Create a new spawn at the cursor and associate it with the selected spawngroup
_c.ops.addspawngroup = "ajax/addspawngroup.php";
//Create a new spawn at the cursor and associate it with a new spawngroup built out of the selected NPC's
_c.ops.newspawngroup = "ajax/newspawngroup.php";
//Add an NPC to the currently selected spawngroup
_c.ops.addnpc = "ajax/addnpc.php";

//All links get passed the following:
    //zonesn
    //zoneid
    //zoneidnumber
//Additional data is passed based on the type.
_c.datatypes = {};

_c.datatypes.zone = {};
    _c.datatypes.zone.save = "";
    _c.datatypes.zone.src = "ajax/zonelist.php";
    _c.datatypes.zone.edit = _c.editormain + "index.php?editor=zone&z=%%zonesn%%&zoneid=%%zoneid%%";

_c.datatypes.spawn = {};
    _c.datatypes.spawn.save = "ajax/spawnsave.php";
    _c.datatypes.spawn.src = "ajax/spawns.php";
    _c.datatypes.spawn.edit = _c.editormain + "index.php?editor=spawn&z=%%zonesn%%&zoneid=%%zoneid%%&sid=%%spawnid%%&action=4";

_c.datatypes.spawn2 = {};
    _c.datatypes.spawn2.edit = _c.editormain + "index.php?editor=spawn&z=%%zonesn%%&zoneid=%%zoneid%%&id=%%spawn2id%%&action=11";

_c.datatypes.npcchance = {};
    _c.datatypes.npcchance.edit = _c.editormain + "index.php?editor=spawn&z=%%zonesn%%&zoneid=%%zoneid%%&npcid=%%npcid%%&sid=%%spawnid%%&sgnpcid=%%npcid%%&action=1";

_c.datatypes.npc = {};
    _c.datatypes.npc.save = "";
    _c.datatypes.npc.src = "ajax/npcs.php";
    _c.datatypes.npc.edit = _c.editormain + "index.php?editor=npc&z=%%zonesn%%&zoneid=%%zoneid%%&npcid=%%npcid%%";

_c.datatypes.grid = {};
    _c.datatypes.grid.save = "ajax/gridsave.php";
    _c.datatypes.grid.src = "ajax/grids.php";
    _c.datatypes.grid.edit = _c.editormain + "index.php?editor=spawn&z=%%zonesn%%&zoneid=%%zoneid%%&pathgrid=%%gridid%%&action=20";

_c.datatypes.object = {};
    _c.datatypes.object.save = "ajax/objectsave.php";
    _c.datatypes.object.src = "ajax/objects.php";
    _c.datatypes.object.edit = _c.editormain + "index.php?editor=misc&z=%%zonesn%%&zoneid=%%zoneid%%&objid=%%objid%%&action=42";

_c.datatypes.door = {};
    _c.datatypes.door.save = "ajax/doorsave.php";
    _c.datatypes.door.src = "ajax/doors.php";
    _c.datatypes.door.edit = _c.editormain + "index.php?editor=misc&z=%%zonesn%%&zoneid=%%zoneid%%&drid=%%doorid%%&action=36";

_c.datatypes.groundspawn = {};
    _c.datatypes.groundspawn.save = "ajax/groundspawnsave.php";
    _c.datatypes.groundspawn.src = "ajax/groundspawns.php";
    _c.datatypes.groundspawn.edit = _c.editormain + "index.php?editor=misc&z=%%zonesn%%&zoneid=%%zoneid%%&gsid=%%gsid%%&action=14";

_c.datatypes.sound = {};
    _c.datatypes.sound.check = "ajax/sound.php?soundcheck";
