<?php

include("db.inc.php");

$db = getDatabase();

$zn = $_GET['zn'];
$zid = $_GET['zid'];
$znum = $_GET['znum'];
$ver = $_GET['ver'];

if(!$ver) { $ver = 0; }

//This needs to remain consistent on the JS side so we'll sacrifice some performance for ease of use.
/*
$ret = pdoQuery($db, "SELECT spawn2.id AS spawn2_id, spawn2 . * , spawnentry . * , spawngroup.id AS spawngroup_id, spawngroup . * , npc_types.name AS npcname, npc_types.level
FROM spawn2
JOIN spawnentry
USING ( spawngroupID )
JOIN spawngroup ON ( spawngroupID = spawngroup.id )
JOIN npc_types ON ( npcID = npc_types.id )
WHERE zone = '$zn' AND spawn2.version = '$ver'");
*/

$q_spawn2 = "SELECT * FROM spawn2 WHERE zone = '$zn' AND version = '$ver'"; // Fast, 0.001 sec
$q_spawngroup = "SELECT * FROM spawngroup WHERE id IN (SELECT spawngroupID FROM spawn2 WHERE zone = '$zn' AND version = '$ver')"; // 0.01 sec for over 300 rows
$q_spawnentry = "SELECT * FROM spawnentry JOIN npc_types ON (npc_types.id = npcID) WHERE spawngroupID IN (SELECT spawngroupID FROM spawn2 WHERE zone = '$zn' AND version = '$ver')"; // Fast with cache from spawngroup query, 0.003 sec


$r_spawn2 = pdoQuery($db, $q_spawn2);
if($r_spawn2['error']) { die("ERROR|" . $e->getMessage()); }

$r_spawngroup = pdoQuery($db, $q_spawngroup);
if($r_spawngroup['error']) { die("ERROR|" . $e->getMessage()); }

$r_spawnentry = pdoQuery($db, $q_spawnentry);
if($r_spawnentry['error']) { die("ERROR|" . $e->getMessage()); }

$spawns = array();
$spawns['spawn2'] = array();
$spawns['spawngroup'] = array();
$spawns['spawnentry'] = array();
$spawns['npc_types'] = array();

$ts = 0;
foreach($r_spawn2['rows'] as $r)
{
    if(!isset($spawns['spawn2'][$r['id']]))
    {
        $spawns['spawn2'][$r['id']] = $r;
        $ts++;
    }
}

foreach($r_spawngroup['rows'] as $r)
{
    if(!isset($spawns['spawngroup'][$r['id']]))
    {
        $spawns['spawngroup'][$r['id']] = $r;
    }
}

foreach($r_spawnentry['rows'] as $r)
{
    if(!isset($spawns['spawnentry'][$r['spawngroupID']]))
    {
        $spawns['spawnentry'][$r['spawngroupID']] = array();
    }
    $spawns['spawnentry'][$r['spawngroupID']][] = array("spawngroupID" => $r['spawngroupID'], "npcID" => $r['npcID'], "chance" => $r['chance']);

    //These npc rows will have a few columns of extra data, but they should never be needed in an NPC context and it makes for a faster query.
    if(!isset($spawns['npc_types'][$r['npcID']]))
    {
        $spawns['npc_types'][$r['npcID']] = $r;
    }
}

print "SPAWNLIST|$ts|" . json_encode($spawns);

?>
