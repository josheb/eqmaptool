<?php

include("db.inc.php");

$db = getDatabase();

$fmtype = $_POST['fmtype'];

switch($fmtype)
{
    case "spawnchance":
        $sgid = intVal($_POST['spawnid']);
        $se = intVal($_POST['entryid']);
        $npc = intVal($_POST['npcid']);
        $chance = intVal($_POST['data']);
        $q = "UPDATE spawnentry SET chance = '$chance' WHERE spawngroupID = '$sgid' AND npcID = '$npc' LIMIT 1";
        $form = "fm_spawnchance_$sgid-$se-$npc";
        break;

    case "gridpause":
        $gid = intVal($_POST['id1']);
        $eid = intVal($_POST['id2']);
        $zid = intVal($_POST['znum']);
        $pause = intVal($_POST['data']);
        $q = "UPDATE grid_entries SET pause = '$pause' WHERE gridid = '$gid' AND number = '$eid' AND zoneid = '$zid'";
        $form = "fm_gridpause_$gid-$eid";
        break;

    case "gridtype":
        $gid = intVal($_POST['gid']);
        $zid = intVal($_POST['znum']);
        $tp = intVal($_POST['data']);
        $q = "UPDATE grid SET type = '$tp' WHERE id = '$gid' AND zoneid = '$zid'";
        $form = "fm_gridtype_$gid";
        break;

    case "pausetype":
        $gid = intVal($_POST['gid']);
        $zid = intVal($_POST['znum']);
        $tp = intVal($_POST['data']);
        $q = "UPDATE grid SET type2 = '$tp' WHERE id = '$gid' AND zoneid = '$zid'";
        $form = "fm_pausetype_$gid";
        break;

    default:
        die("ERROR|Unknown form type! - $fmtype");
}

$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$data = array( "fmtype" => $fmtype, "form" => $form );

print "FORMSAVE|1|" . json_encode($data);

?>
