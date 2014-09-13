<?php

function getDatabase()
{
    try {
        $db = new PDO('mysql:host=localhost;dbname=peq', 'username', 'password', array( PDO::ATTR_PERSISTENT => false));
    } catch (PDOException $e) {
        die("ERROR|".$e->getMessage());
        return(false);
    }
    return($db);
}

function pdoQuery($db, $q)
{
    $data = array();
    $data['error'] = false;
    $data['rows'] = false;
    $data['numrows'] = false;

    try {
        $st = $db->prepare($q);
        $st->execute();
        $data['numrows'] = $st->rowCount();
    } catch (PDOException $e) {
        $data['error'] = $e->getMessage();
        return($data);
    }

    $data['rows'] = array();
    $data['numrows'] = $st->rowCount();
    while($row = $st->fetch(PDO::FETCH_ASSOC))
    {
        $data['rows'][] = $row;
    }

    $data['insert_id'] = $db->lastInsertId();

    return($data);
}

?>
