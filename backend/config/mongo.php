<?php

function get_mongo_manager(): MongoDB\Driver\Manager {
    $uri = getenv('MONGO_URI') ?: 'mongodb://127.0.0.1:27017';
    return new MongoDB\Driver\Manager($uri);
}

const MONGO_DB = 'homeease';
const MONGO_MAINTENANCE_COLLECTION = MONGO_DB . '.maintenance_requests';

function mongo_insert_maintenance_request(array $doc): string {
    $manager = get_mongo_manager();
    $doc['_id'] = new MongoDB\BSON\ObjectId();
    $doc['submittedAt'] = new MongoDB\BSON\UTCDateTime();

    $bulk = new MongoDB\Driver\BulkWrite();
    $bulk->insert($doc);
    $manager->executeBulkWrite(MONGO_MAINTENANCE_COLLECTION, $bulk);

    return (string) $doc['_id'];
}


function mongo_find_maintenance_requests(array $filter = [], int $limit = 100): array {
    $manager = get_mongo_manager();
    $options = ['sort' => ['submittedAt' => -1], 'limit' => $limit];
    $query = new MongoDB\Driver\Query($filter, $options);
    $cursor = $manager->executeQuery(MONGO_MAINTENANCE_COLLECTION, $query);

    $results = [];
    foreach ($cursor as $doc) {
        $arr = (array) $doc;
        $arr['_id'] = (string) $arr['_id'];
        if (isset($arr['submittedAt']) && $arr['submittedAt'] instanceof MongoDB\BSON\UTCDateTime) {
            $arr['submittedAt'] = $arr['submittedAt']->toDateTime()->format('Y-m-d');
        }
        $results[] = $arr;
    }
    return $results;
}

function mongo_update_maintenance_request(
    string $id,
    int $landlordId,
    array $changes
): bool {
    $manager = get_mongo_manager();

    $bulk = new MongoDB\Driver\BulkWrite();

    $bulk->update(
        [
            '_id' => new MongoDB\BSON\ObjectId($id),
            'landlordId' => $landlordId,
        ],
        [
            '$set' => $changes,
        ],
        [
            'multi' => false,
            'upsert' => false,
        ]
    );

    $result = $manager->executeBulkWrite(
        MONGO_MAINTENANCE_COLLECTION,
        $bulk
    );

    return $result->getMatchedCount() > 0;
}
