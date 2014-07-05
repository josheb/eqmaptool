<?php

include("db.inc.php");

$db = getDatabase();

$stype = $_POST['type'];
$sfield = $_POST['field'];
$sval = $_POST['value'];

if($stype == "npc") { $table = "npc_types"; }
if($stype == "spawngroup") { $table = "spawngroup"; }

//If we add more options we should make a table of tables keyed by field type to field name.
$field = $sfield;
if($field == "id") { $wstr = " = '$sval'"; }
else { $wstr = " LIKE '%$sval%'"; }

$ret = pdoQuery($db, "SELECT * FROM $table WHERE $field $wstr");
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

print "SEARCH|" .$stype. "|" . json_encode($ret['rows']);

?>
