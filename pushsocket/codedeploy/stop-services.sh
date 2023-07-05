#!/bin/bash

name=`hostname`

if [ "$name" = "SportRadarStats-ubuntu" ]
then
    /etc/init.d/init-sportradar.sh stop
fi
if [ "$name" = "NodeJs-Server-ubuntu" ]
then
    /etc/init.d/init-livecenter.sh stop
fi