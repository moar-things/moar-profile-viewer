#!/usr/bin/env bash

# This file is used to invoke a top-level make for the npm watch task,
# capture the status code, print some emoji based on status code, and
# exit with 0 to keep nodemon happy.

make $1
MAKE_RC=$?

if [ $MAKE_RC -eq 0 ]
then
  echo "💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  💚  `date`"
else
  echo "❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  ❌  `date`"
fi
