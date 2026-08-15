#!/usr/bin/env bash
set -x

if [ "${CI_XCODEBUILD_EXIT_CODE}" != "0" ]; then
  echo "xcodebuild did not succeed (exit ${CI_XCODEBUILD_EXIT_CODE}) — skipping OtaKit release."
  exit 0
fi

if [ "${CI_XCODEBUILD_ACTION}" != "archive" ]; then
  echo "Not an archive action (${CI_XCODEBUILD_ACTION}) — skipping OtaKit release."
  exit 0
fi

npm install -g @otakit/cli

cd ../../..

set +e
unset OTA_CHANNEL
otakit upload --release
OTA_RELEASE_STATUS=$?
if [ $OTA_RELEASE_STATUS -ne 0 ]; then
  echo "OtaKit release failed, retrying once..."
  sleep 3
  otakit upload --release
  OTA_RELEASE_STATUS=$?
fi
set -e

if [ $OTA_RELEASE_STATUS -eq 0 ]; then
  echo "OtaKit release published successfully."
else
  echo "OtaKit release failed after retry. Manual retry needed:"
  echo "  unset OTA_CHANNEL && otakit upload --release"
fi
