<?php

include("db.inc.php");

$db = getDatabase();

$zn = $_GET['zn'];
$ver = $_GET['ver'];

if(!$ver) { $ver = 0; }

/*
try {
    $q = "SELECT * FROM spawn2 WHERE zone = '$zn' AND version = '$ver'";
    $st = $db->prepare($q);
    $st->execute();
} catch (PDOException $e) {
    die("ERROR|" . $e->getMessage());
}

$spawns = array();
while($row = $st->fetch(PDO::FETCH_ASSOC))
{
    $spawns[] = $row;
}
*/

//$ret = pdoQuery($db, "SELECT * FROM spawn2 WHERE zone = '$zn' AND version = '$ver'");
$ret = pdoQuery($db, "SELECT spawn2.id AS spawn2_id, spawn2 . * , spawnentry . * , spawngroup.id AS spawngroup_id, spawngroup . * , npc_types.name AS npcname, npc_types.level
FROM spawn2
JOIN spawnentry
USING ( spawngroupID )
JOIN spawngroup ON ( spawngroupID = spawngroup.id )
JOIN npc_types ON ( npcID = npc_types.id )
WHERE zone = '$zn' AND spawn2.version = '$ver'");

if($ret['error'])
{
    die("ERROR|" . $e->getMessage());
}

$spawns = array();
$ts = 0;
foreach($ret['rows'] as $r)
{
    if(!isset($spawns[$r['spawn2_id']]))
    {
        $srow = $r;
        unset($srow['npcID']);
        unset($srow['chance']);
        unset($srow['npcname']);
        unset($srow['level']);
        $spawns[$r['spawn2_id']] = $srow;
        $spawns[$r['spawn2_id']]['entries'] = array();
        $ts++;
    }

    $spawns[$r['spawn2_id']]['entries'][] = array( "npcid" => $r['npcID'], "chance" => $r['chance'], "name" => $r['npcname'], "level" => $r['level']);
}

print "SPAWNLIST|$ts|" . json_encode($spawns);

?>
