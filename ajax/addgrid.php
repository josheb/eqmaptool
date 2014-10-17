<?php

include("db.inc.php");

$db = getDatabase();

$zid = intVal($_POST['znum']);
$sid = intVal($_POST['sid']);

$q = "SELECT MAX(id) AS maxid FROM grid WHERE zoneid = '$zid'";
$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$newid = $ret['rows'][0]['maxid'] + 1;

$aq = "INSERT INTO grid (id, zoneid, type, type2) VALUES('$newid', '$zid', 0, 0)";
$ret = pdoQuery($db, $aq);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$sq = "UPDATE spawn2 SET pathgrid = '$newid' WHERE id = '$sid' LIMIT 1";
$ret = pdoQuery($db, $sq);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$gdata = array();
$gdata['grid'] = array( "id" => $newid, "zoneid" => $zid, "type" => 0, "type2" => 0 );
$gdata['sid'] = $sid;

print "ADDGRID|$newid|" . json_encode($gdata);

?>
