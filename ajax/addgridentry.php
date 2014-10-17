<?php

include("db.inc.php");

$db = getDatabase();

$zid = intVal($_POST['znum']);
$gid = intVal($_POST['gid']);
$x = floatVal($_POST['x']);
$y = floatVal($_POST['y']);
$z = floatVal($_POST['z']);

$heading = -1;
$pause = 0;

$q = "SELECT number FROM grid_entries WHERE zoneid = '$zid' AND gridid = '$gid' ORDER BY number DESC LIMIT 1";
$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

if($ret['numrows'] > 0)
{
    $lastnum = $ret['rows'][0]['number'];
    $newnum = $lastnum + 1;
}
else
{
    $lastnum = -1;
    $newnum = 0;
}

$aq = "INSERT INTO grid_entries (gridid, zoneid, number, x, y, z, heading, pause) VALUES ('$gid', '$zid', '$newnum', '$x', '$y', '$z', '$heading', '$pause')";
$ret = pdoQuery($db, $aq);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$ge = array();
$ge['grid_entry'] = array( "gridid" => $gid, "zoneid" => $zid, "number" => $newnum, "x" => $x, "y" => $y, "z" => $z, "heading" => $heading, "pause" => $pause );
$ge['newnum'] = $newnum;
$ge['lastnum'] = $lastnum;

print "ADDGRIDENTRY|$newnum|" . json_encode($ge);

?>
