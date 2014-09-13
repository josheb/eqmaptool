<?php

include("db.inc.php");

$db = getDatabase();

$nx = floatVal($_POST['x']);
$ny = floatVal($_POST['y']);
$nz = floatVal($_POST['z']);
//$sgid = intVal($_POST['sgid']);
//$sid = intVal($_POST['sid']);
$zn = $_POST['zn'];
$zid = $_POST['zid'];
$ver = $_POST['ver'];
$respawn = $_POST['respawntime'];
$variance = $_POST['variance'];
$npclist = json_decode($_POST['npclist'], 1);

//print "ERROR||";
//print_r($_POST);
//die();

//Make the spawngroup entry.
$ts = mktime();
$sname = "new".$ts;
$q = "INSERT INTO spawngroup (name, spawn_limit, dist, max_x, min_x, max_y, min_y, delay, despawn, despawn_timer) VALUES ('$sname', 0, 0, 0, 0, 0, 0, 0, 0, 100)";
$ret = pdoQuery($db, $q);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}
$sgid = $ret['insert_id'];
if($sgid == 0)
{
    die("ERROR|Spawngroup creation failed");
}

//Add entries to the spawngroup
$nnpclist = array();
foreach($npclist as $npcdata)
{
    $npcid = $npcdata['id'];
    $chance = $npcdata['chance'];

    $nq = "INSERT INTO spawnentry (spawngroupID, npcID, chance) VALUES ($sgid, '$npcid', $chance)"; //Let initial chance be 0 until we figure out how to deal with it better.
    $nnpclist[] = array( 'npcid' => $npcid, 'chance' => $chance);
    $ret = pdoQuery($db, $nq);
    if($ret['error'])
    {
        die("ERROR|" . $ret['error']);
    }
}

//Add the new spawn
$sq = "INSERT INTO spawn2 (spawngroupID, zone, version, x, y, z, heading, respawntime, variance, pathgrid, _condition, cond_value, enabled, animation) VALUES
      ('$sgid', '$zn', '$ver', '$nx', '$ny', '$nz', 0, '$respawn', '$variance', 0, 0, 1, 1, 0)";

$ret = pdoQuery($db, $sq);
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

$sp2 = $ret['insert_id'];

$q_spawn2 = "SELECT * FROM spawn2 WHERE id = '$sp2'";
$q_spawngroup = "SELECT * FROM spawngroup WHERE id = '$sgid'";
$q_spawnentry = "SELECT * FROM spawnentry WHERE spawngroupID = '$sgid'";

$r_spawn2 = pdoQuery($db, $q_spawn2);
if($r_spawn2['error']) { die("ERROR|". $r_spawn2['error']); }

$r_spawngroup = pdoQuery($db, $q_spawngroup);
if($r_spawngroup['error']) { die("ERROR|". $r_spawngroup['error']); }

$r_spawnentry = pdoQuery($db, $q_spawnentry);
if($r_spawnentry['error']) { die("ERROR|". $r_spawnentry['error']); }

$_POST['newid'] = $ret['insert_id'];
$_POST['newsgid'] = $sgid;
$_POST['npclist'] = $nnpclist;
$_POST['sgname'] = $sname;
$_POST['newspawn2'] = $r_spawn2['rows'][0];
$_POST['newsg'] = $r_spawngroup['rows'][0];
$_POST['newse'] = array();
foreach($r_spawnentry['rows'] as $r)
{
    $_POST['newse'][] = $r;
}

print "NEWSPAWNGROUP|0|" . json_encode($_POST);

?>
