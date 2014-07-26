<?php

include("db.inc.php");

$db = getDatabase();

$nx = floatVal($_POST['x']);
$ny = floatVal($_POST['y']);
$nz = floatVal($_POST['z']);
$sgid = intVal($_POST['sgid']);
$sid = intVal($_POST['sid']);
$zn = $_POST['zn'];
$zid = $_POST['zid'];
$ver = $_POST['ver'];
$respawn = $_POST['respawntime'];
$variance = $_POST['variance'];

$q = "INSERT INTO spawn2 (spawngroupID, zone, version, x, y, z, heading, respawntime, variance, pathgrid, _condition, cond_value, enabled, animation) VALUES
      ('$sgid', '$zn', '$ver', '$nx', '$ny', '$nz', 0, '$respawn', '$variance', 0, 0, 1, 1, 0)";

$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$_POST['newid'] = $ret['insert_id'];

print "ADDSPAWNGROUP|0|" . json_encode($_POST);

?>
