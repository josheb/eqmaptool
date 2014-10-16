<?php

include("db.inc.php");

$db = getDatabase();

//print "ERROR|";
//print_r($_POST);

$nx = floatVal($_POST['x']);
$ny = floatVal($_POST['y']);
$nz = floatVal($_POST['z']);
$hd = floatVal($_POST['heading']);
$id = intVal($_POST['id']);
$gid = intVal($_POST['id2']);
$znum = intVal($_POST['znum']);
$zid = intVal($_POST['zid']);

$q = "UPDATE grid_entries SET x = '$nx', y = '$ny', z = '$nz', heading = '$hd' WHERE zoneid = '$znum' AND gridid = '$id' AND number = '$gid' LIMIT 1";

$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$data = array("x" => $nx, "y" => $ny, "z" => $nz, "heading" => $hd, "id2" => $gid);

print "GRIDSAVE|$id|" . json_encode($data);

?>
