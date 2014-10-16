<?php

include("db.inc.php");

$db = getDatabase();

$zid = $_GET['znum'];

// Grids themselves are not versioned
//$ver = $_GET['ver'];
//if(!$ver) { $ver = 0; }

//$ret = pdoQuery($db, "SELECT * FROM grid_entries JOIN grid ON (grid.id = gridid) WHERE grid_entries.zoneid = '$zid'");

$gridret = pdoQuery($db, "SELECT * FROM grid WHERE zoneid = '$zid' ORDER BY id");
$geret = pdoQuery($db, "SELECT * FROM grid_entries WHERE zoneid = '$zid' ORDER BY gridid, number");

if($geret['error'] or $gridret['error'])
{
    die("ERROR|" . $e->getMessage());
}

$ret = array();
$ret['grids'] = array();
$ret['grid_entries'] = array();

$tg = 0;
foreach($gridret['rows'] as $r)
{
    $ret['grids'][$r['id']] = $r;
    $tg++;
}

foreach($geret['rows'] as $r)
{
    if(!$ret['grid_entries'][$r['gridid']]) { $ret['grid_entries'][$r['gridid']] = array(); }
    $ret['grid_entries'][$r['gridid']][$r['number']] = $r;
}

print "GRIDLIST|$tg|" . json_encode($ret);

?>
