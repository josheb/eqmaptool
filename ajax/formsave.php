<?php

include("db.inc.php");

$db = getDatabase();

$fmtype = $_POST['fmtype'];

switch($fmtype)
{
    case "spawnchance":
        $sgid = $_POST['spawnid'];
        $se = $_POST['entryid'];
        $npc = $_POST['npcid'];
        $chance = $_POST['chance'];
        $q = "UPDATE spawnentry SET chance = '$chance' WHERE spawngroupID = '$sgid' AND npcID = '$npc' LIMIT 1";
        $form = "fm_spawnchance_$sgid-$se-$npc";
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
