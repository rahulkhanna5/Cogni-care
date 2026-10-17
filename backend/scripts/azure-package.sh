#!/usr/bin/env bash
# Builds backend/deploy.zip for Azure App Service (Linux, Node 22).
#
# The TypeScript is compiled HERE (plain JS runs anywhere), but node_modules is
# NOT shipped: argon2 is a native module, and one built on a Mac does not run
# on Azure's Linux. Azure installs the production dependencies itself on
# deploy (SCM_DO_BUILD_DURING_DEPLOYMENT=true), compiling argon2 for Linux.
# package.json goes up without its "build" script, so Azure does not try to run
# tsc (a dev dependency it will not have installed).
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
rm -rf deploy deploy.zip
mkdir -p deploy/src/db
cp -R dist deploy/dist
cp -R src/db/migrations deploy/src/db/migrations   # read at start-up (migrate.ts)
cp package-lock.json deploy/
node -e "
  const p = require('./package.json');
  delete p.scripts.build; delete p.devDependencies;
  p.scripts = { start: p.scripts.start };
  require('fs').writeFileSync('deploy/package.json', JSON.stringify(p, null, 2));
"
(cd deploy && zip -qr ../deploy.zip .)
rm -rf deploy
echo "deploy.zip ready ($(du -h deploy.zip | cut -f1))"
