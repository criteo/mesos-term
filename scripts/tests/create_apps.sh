#!/bin/bash

script_dir=`dirname "$0"`

$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app1.json
$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app2.json
$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app3.json
$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app4.json
$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app5.json
$script_dir/mesos/create_app.sh $script_dir/mesos/apps/app6.json
