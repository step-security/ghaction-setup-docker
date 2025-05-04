[![GitHub release](https://img.shields.io/github/release/step-security/ghaction-setup-docker.svg?style=flat-square)](https://github.com/step-security/ghaction-setup-docker/releases/latest)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-docker--setup--docker-blue?logo=github&style=flat-square)](https://github.com/marketplace/actions/docker-setup-docker)
[![CI workflow](https://img.shields.io/github/actions/workflow/status/step-security/ghaction-setup-docker/ci.yml?branch=main&label=ci&logo=github&style=flat-square)](https://github.com/step-security/ghaction-setup-docker/actions?workflow=ci)
[![Test workflow](https://img.shields.io/github/actions/workflow/status/step-security/ghaction-setup-docker/test.yml?branch=main&label=test&logo=github&style=flat-square)](https://github.com/step-security/ghaction-setup-docker/actions?workflow=test)
[![Codecov](https://img.shields.io/codecov/c/github/step-security/ghaction-setup-docker?logo=codecov&style=flat-square)](https://codecov.io/gh/step-security/ghaction-setup-docker)

## About

GitHub Action to set up (download and install) [Docker CE](https://docs.docker.com/engine/).
Works on Linux, macOS and Windows.

> [!WARNING]
> Does not work on macOS runners with ARM architecture (no nested virtualization):
> * https://github.com/docker/actions-toolkit/issues/317

![Screenshot](.github/setup-docker-action.png)

___

* [Usage](#usage)
  * [Quick start](#quick-start)
  * [Daemon configuration](#daemon-configuration)
  * [Define custom `limactl start` arguments (macOS)](#define-custom-limactl-start-arguments-macos)
* [Customizing](#customizing)
  * [inputs](#inputs)
  * [outputs](#outputs)
* [Contributing](#contributing)
* [License](#license)

## Usage

### Quick start

```yaml
name: ci

on:
  push:

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Set up Docker
        uses: step-security/ghaction-setup-docker@v3
```

> [!IMPORTANT]
> macOS runners hang with latest QEMU 9.1.0. You need to install QEMU 9.0.2 as
> a workaround:
> ```yaml
> name: ci
> 
> on:
>   push:
> 
> jobs:
>   docker:
>     runs-on: macos-13
>     steps:
>       -
>         # https://github.com/crazy-max/ghaction-setup-docker/issues/108
>         name: Install QEMU 9.0.2
>         uses: docker/actions-toolkit/.github/actions/macos-setup-qemu@19ca9ade20f5da695f76a10988d6532058575f82
>       -
>         name: Set up Docker
>         uses: crazy-max/ghaction-setup-docker@v3
> ```
> More info: https://github.com/crazy-max/ghaction-setup-docker/issues/108.

### Daemon configuration

You can [configure the Docker daemon](https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file)
using the `daemon-config` input. In the following example, we configure the
Docker daemon to enable debug and the [containerd image store](https://docs.docker.com/storage/containerd/)
feature:

```yaml
name: ci

on:
  push:

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      -
        name: Set up Docker
        uses: step-security/ghaction-setup-docker@v3
        with:
          daemon-config: |
            {
              "debug": true,
              "features": {
                "containerd-snapshotter": true
              }
            }
```

### Define custom `limactl start` arguments (macOS)

You can define custom [`limactl start` arguments](https://lima-vm.io/docs/reference/limactl_start/)
using the `LIMA_START_ARGS` environment variable to customize the VM:

```yaml
name: ci

on:
  push:

jobs:
  docker:
    runs-on: macos-latest
    steps:
      -
        name: Set up Docker
        uses: step-security/ghaction-setup-docker@v3
        env:
          LIMA_START_ARGS: --cpus 4 --memory 8
```

## Customizing

### inputs

The following inputs can be used as `step.with` keys

| Name            | Type   | Default               | Description                                                                                                                 |
|-----------------|--------|-----------------------|-----------------------------------------------------------------------------------------------------------------------------|
| `version`       | String | `latest`              | Docker CE version (e.g., `v24.0.6`).                                                                                        |
| `channel`       | String | `stable`              | Docker CE [channel](https://download.docker.com/linux/static/) (e.g, `stable`, `edge` or `test`).                           |
| `daemon-config` | String |                       | [Docker daemon JSON configuration](https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-configuration-file) |
| `context`       | String | `setup-docker-action` | Docker context name.                                                                                                        |
| `set-host`      | Bool   | `false`               | Set `DOCKER_HOST` environment variable to docker socket path.                                                               |

### outputs

The following outputs are available

| Name   | Type   | Description        |
|--------|--------|--------------------|
| `sock` | String | Docker socket path |

## License

Apache-2.0. See `LICENSE` for more details.
