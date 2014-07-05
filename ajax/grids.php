<?php

include("db.inc.php");

$db = getDatabase();

$zid = $_GET['zid'];

// Grids themselves are not versioned
//$ver = $_GET['ver'];
//if(!$ver) { $ver = 0; }

//$ret = pdoQuery($db, "SELECT * FROM grid_entries JOIN grid ON (grid.id = gridid) WHERE grid_entries.zoneid = '$zid'");

$gridret = pdoQuery($db, "SELECT * FROM grid WHERE zoneid = '$zid'");
$geret = pdoQuery($db, "SELECT * FROM grid_entries WHERE zoneid = '$zid'");

if($geret['error'] or $gridret['error'])
{
    die("ERROR|" . $e->getMessage());
}

$grids = array();
$tg = 0;
foreach($gridret['rows'] as $r)
{
    if(!$grids[$r['id']]) { $grids[$r['id']] = array(); $tg++; }
    $grids[$r['id']] = $r;
    $grids[$r['id']]['entries'] = array();
}

foreach($geret['rows'] as $r)
{
    $grids[$r['gridid']]['entries'][$r['number']] = $r;
}

print "GRIDLIST|$tg|" . json_encode($grids);


?>
