#!/bin/bash

name=`hostname`

if [ "$name" = "SportRadarStats-ubuntu" ]
then
    /etc/init.d/init-sportradar.sh start
fi
if [ "$name" = "NodeJs-Server-ubuntu" ]
then
    /etc/init.d/init-livecenter.sh start
fi