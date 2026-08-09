<?php

require_once __DIR__ . '/redis.php';

function invalidate_dashboard_cache(int $landlordId): void
{
    try {
        $redis = get_redis();
        $redis->del("dashboard:summary:{$landlordId}");
    } catch (RedisException $e) {

    }
}