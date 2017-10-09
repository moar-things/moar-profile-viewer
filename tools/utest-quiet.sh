#!/usr/bin/env bash

TEST_NAME="unit"
TEST_FILE=test/index.js
TEST_OUT=utest-out.txt
TEST_ERR=utest-err.txt

TOOLS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TMP_DIR=$TOOLS_DIR/../tmp
NMB_DIR=$TOOLS_DIR/../node_modules/.bin

mkdir -p $TMP_DIR

echo "running $TEST_NAME tests"
FORCE_COLOR=1 $NMB_DIR/tape $TEST_FILE > $TMP_DIR/$TEST_OUT 2> $TMP_DIR/$TEST_ERR
TEST_RC=$?

egrep '^# ((tests)|(pass))' $TMP_DIR/$TEST_OUT

if [ $TEST_RC -eq 0 ]
then
  echo "$TEST_NAME tests ran successfully!!"
  cat $TMP_DIR/$TEST_ERR
  exit 0
else
  cat $TMP_DIR/$TEST_OUT | $NMB_DIR/tap-spec
  echo ""
  cat $TMP_DIR/$TEST_ERR
  echo ""
  echo "$TEST_NAME tests failed!!"
  exit 1
fi
