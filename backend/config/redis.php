<?php

function get_redis(): Redis {
    static $redis = null;
    if ($redis === null) {
        $redis = new Redis();
        $host = getenv('REDIS_HOST') ?: '127.0.0.1';
        $port = (int) (getenv('REDIS_PORT') ?: 6379);
        $redis->connect($host, $port, 1.5);
    }
    return $redis;
}
