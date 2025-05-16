import * as crypto from 'crypto';
import os from 'os';
import path from 'path';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';
import {Install} from '@docker/actions-toolkit/lib/docker/install';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker';
import axios, {isAxiosError} from 'axios';

import * as context from './context';
import * as stateHelper from './state-helper';

async function validateSubscription(): Promise<void> {
  const API_URL = `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/subscription`;

  try {
    await axios.get(API_URL, {timeout: 3000});
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      core.error('Subscription is not valid. Reach out to support@stepsecurity.io');
      process.exit(1);
    } else {
      core.info('Timeout or API not reachable. Continuing to next step.');
    }
  }
}

actionsToolkit.run(
  // main
  async () => {
    await validateSubscription();

    const input: context.Inputs = context.getInputs();
    const runDir = path.join(os.homedir(), `setup-docker-action-${crypto.randomUUID().slice(0, 8)}`);

    if (input.context == 'default') {
      throw new Error(`'default' context cannot be used.`);
    }

    const install = new Install({
      runDir: runDir,
      source: input.source,
      rootless: input.rootless,
      contextName: input.context || 'setup-docker-action',
      daemonConfig: input.daemonConfig
    });
    let toolDir;
    if (!(await Docker.isAvailable()) || input.source) {
      await core.group(`Download docker`, async () => {
        toolDir = await install.download();
      });
    }
    if (toolDir) {
      stateHelper.setRunDir(runDir);
      const sockPath = await install.install();
      await core.group(`Setting outputs`, async () => {
        core.info(`sock=${sockPath}`);
        core.setOutput('sock', sockPath);
      });

      if (input.setHost) {
        await core.group(`Setting Docker host`, async () => {
          core.exportVariable('DOCKER_HOST', sockPath);
          core.info(`DOCKER_HOST=${sockPath}`);
        });
      }
    }

    await core.group(`Docker info`, async () => {
      await Docker.printVersion();
      await Docker.printInfo();
    });
  },
  // post
  async () => {
    if (stateHelper.runDir.length == 0) {
      return;
    }
    const install = new Install({
      runDir: stateHelper.runDir
    });
    await install.tearDown();
  }
);
