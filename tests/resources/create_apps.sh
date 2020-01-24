#!/bin/bash

script_dir=`dirname "$0"`

$script_dir/create_app.sh $script_dir/apps/app1.json
$script_dir/create_app.sh $script_dir/apps/app2.json
$script_dir/create_app.sh $script_dir/apps/app3.json
$script_dir/create_app.sh $script_dir/apps/app4.json
$script_dir/create_app.sh $script_dir/apps/app5.json
$script_dir/create_app.sh $script_dir/apps/app6.json
$script_dir/create_pod.sh $script_dir/apps/pod1.json
