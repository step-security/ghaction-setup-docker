import * as crypto from 'crypto';
import * as fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import * as actionsToolkit from '@docker/actions-toolkit';
import {Install} from '@docker/actions-toolkit/lib/docker/install.js';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker.js';
import axios, {isAxiosError} from 'axios';
import {Install as RegclientInstall} from '@docker/actions-toolkit/lib/regclient/install.js';
import {Install as UndockInstall} from '@docker/actions-toolkit/lib/undock/install.js';

import * as context from './context.js';
import * as stateHelper from './state-helper.js';

async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let repoPrivate: boolean | undefined;

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    repoPrivate = eventData?.repository?.private;
  }

  const upstream = 'crazy-max/ghaction-setup-docker';
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl = 'https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions';

  core.info('');
  core.info('\u001b[1;36mStepSecurity Maintained Action\u001b[0m');
  core.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false) core.info('\u001b[32m\u2713 Free for public repositories\u001b[0m');
  core.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  core.info('');

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const body: Record<string, string> = {action: action || ''};
  if (serverUrl !== 'https://github.com') body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      {timeout: 3000}
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      core.error(`\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`);
      core.error(`\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`);
      process.exit(1);
    }
    core.info('Timeout or API not reachable. Continuing to next step.');
  }
}

const regctlDefaultVersion = 'v0.8.3';
const undockDefaultVersion = 'v0.10.0';

actionsToolkit.run(
  // main
  async () => {
    await validateSubscription();

    const input: context.Inputs = context.getInputs();
    const runDir = path.join(input.runtimeBasedir, `run-${crypto.randomUUID().slice(0, 8)}`);

    if (input.context == 'default') {
      throw new Error(`'default' context cannot be used.`);
    }

    if (input.source.type === 'image') {
      await core.group(`Download and install regctl`, async () => {
        const regclientInstall = new RegclientInstall({githubToken: input.githubToken});
        const regclientBinPath = await regclientInstall.download(
          process.env.REGCTL_VERSION && process.env.REGCTL_VERSION.trim()
            ? process.env.REGCTL_VERSION
            : regctlDefaultVersion,
          true
        );
        await regclientInstall.install(regclientBinPath);
      });
      await core.group(`Download and install undock`, async () => {
        const undockInstall = new UndockInstall({githubToken: input.githubToken});
        const undockBinPath = await undockInstall.download(
          process.env.UNDOCK_VERSION && process.env.UNDOCK_VERSION.trim()
            ? process.env.UNDOCK_VERSION
            : undockDefaultVersion,
          true
        );
        await undockInstall.install(undockBinPath);
      });
    }

    let tcpPort: number | undefined;
    let tcpAddress: string | undefined;
    if (input.tcpPort) {
      tcpPort = input.tcpPort;
      tcpAddress = `tcp://127.0.0.1:${tcpPort}`;
    }

    const install = new Install({
      runDir: runDir,
      source: input.source,
      rootless: input.rootless,
      contextName: input.context || 'setup-docker-action',
      daemonConfig: input.daemonConfig,
      localTCPPort: tcpPort,
      githubToken: input.githubToken
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
        if (tcpAddress) {
          core.info(`tcp=${tcpAddress}`);
          core.setOutput('tcp', tcpAddress);
        }
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
