<?php

	require_once('../config/config.php');

	if(isset($_GET['soundcheck'])){ 
		$zonename = $_GET['zone'];
		if(file_exists($root_dir . '/music/' . $zonename . '.mp3')){ $file = $zonename . '.mp3'; $method = 2;  }
		else if(file_exists($root_dir . '/music/' . $zonename . '.midi')){ $file = $zonename . '.midi'; $method = 1; }
		if($method == 1){ echo '<EMBED SRC="music/' . $file . '" hidden=true autostart=true loop=true VOLUME=40>'; }
		else if($method == 2){ echo '<EMBED SRC="music/' . $file . '" hidden=true autostart=true loop=true VOLUME=40>'; }
	}
	
?>
