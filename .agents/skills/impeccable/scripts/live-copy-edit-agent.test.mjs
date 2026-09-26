import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MANUAL_EDIT_VALIDATE_SCRIPT_OPT_IN_ENV,
  readManualEditValidationScript,
  runManualEditValidationScript,
} from './live-copy-edit-agent.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sandboxRoot = path.join(__dirname, '.live-copy-edit-agent-test-workspaces');

function createWorkspace(t) {
  fs.mkdirSync(sandboxRoot, { recursive: true });
  const workspace = fs.mkdtempSync(path.join(sandboxRoot, 'workspace-'));
  t.after(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });
  return workspace;
}

function writeWorkspacePackageJson(workspace) {
  const markerFile = path.join(workspace, 'marker.txt');
  const script = `"${process.execPath}" -e "require('node:fs').writeFileSync('marker.txt','ran')"`;
  fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({
    name: 'impeccable-live-copy-edit-agent-test',
    private: true,
    scripts: {
      'impeccable:manual-edit-validate': script,
    },
  }, null, 2));
  return { markerFile, script };
}

test('manual edit validation script does not execute without explicit opt-in', (t) => {
  const workspace = createWorkspace(t);
  const { markerFile, script } = writeWorkspacePackageJson(workspace);

  assert.equal(readManualEditValidationScript(workspace), script);

  const result = runManualEditValidationScript(workspace, { env: {} });

  assert.equal(fs.existsSync(markerFile), false);
  assert.deepEqual(result, {
    warning: {
      file: 'package.json',
      reason: 'manual_edit_validation_skipped',
      message: `Skipped scripts.impeccable:manual-edit-validate because explicit opt-in via ${MANUAL_EDIT_VALIDATE_SCRIPT_OPT_IN_ENV}=1 is required.`,
    },
  });
});

test('manual edit validation script executes when explicit opt-in is enabled', (t) => {
  const workspace = createWorkspace(t);
  const { markerFile } = writeWorkspacePackageJson(workspace);

  const result = runManualEditValidationScript(workspace, {
    env: {
      [MANUAL_EDIT_VALIDATE_SCRIPT_OPT_IN_ENV]: '1',
    },
  });

  assert.equal(result, null);
  assert.equal(fs.readFileSync(markerFile, 'utf-8'), 'ran');
});
