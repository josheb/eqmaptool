<?php

include("db.inc.php");

$db = getDatabase();

/*
try
{
    $q = "SELECT short_name, long_name, safe_x, safe_y, safe_z, zoneidnumber, id FROM zone ORDER BY short_name";
    $st = $db->prepare($q);
    $st->execute();
} catch (PDOException $e) {
    die("ERROR|" . $e->getMessage());
}

$zones = array();
while($row = $st->fetch(PDO::FETCH_ASSOC))
{
    $zones[] = $row;
}
*/

$ret = pdoQuery($db, "SELECT short_name, long_name, safe_x, safe_y, safe_z, zoneidnumber, id FROM zone ORDER BY short_name");
if($ret['error'])
{
    die("ERROR|" . $ret['error']);
}

for($x = 0; $x < count($ret['rows']); $x++)
{
    $ret['rows'][$x]['file_exists'] = 0;
    if(file_exists("../mapjs/".$ret['rows'][$x]['short_name'].".js"))
    {
        $ret['rows'][$x]['file_exists'] = 1;
    }
}

print "ZONELIST|" . $ret['rowcount'] . "|" . json_encode($ret['rows']);

?>
