import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const npmExecPath = process.env.npm_execpath;

if (npmExecPath === undefined) {
  throw new Error('Run the package smoke through `npm run test:package`.');
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'espn-api-client-package-'));

function runNode(arguments_, workingDirectory = temporaryDirectory) {
  execFileSync(process.execPath, arguments_, {
    cwd: workingDirectory,
    stdio: 'inherit',
  });
}

function runNpm(arguments_, workingDirectory = temporaryDirectory, capture = false) {
  return execFileSync(process.execPath, [npmExecPath, ...arguments_], {
    cwd: workingDirectory,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

try {
  const packOutput = runNpm(
    ['pack', '--json', '--ignore-scripts', '--pack-destination', temporaryDirectory],
    repositoryRoot,
    true,
  );
  const packResults = JSON.parse(packOutput);
  const filename = packResults[0]?.filename;
  if (typeof filename !== 'string') {
    throw new Error('npm pack did not report a tarball filename.');
  }

  await writeFile(
    path.join(temporaryDirectory, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
  );
  runNpm([
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    path.join(temporaryDirectory, filename),
  ]);

  await writeFile(
    path.join(temporaryDirectory, 'consumer.mjs'),
    `import { ESPNClient } from 'espn-api-client';
const client = new ESPNClient({ maxRetries: 0 });
if (client.sport !== 'football' || typeof client.scoreboard.get !== 'function') {
  throw new Error('Installed JavaScript package exposed an invalid client.');
}
`,
  );
  runNode(['consumer.mjs']);

  await writeFile(
    path.join(temporaryDirectory, 'consumer.ts'),
    `import { ESPNClient, type ScoreboardResponse } from 'espn-api-client';
const client: ESPNClient = new ESPNClient({ sport: 'basketball', league: 'nba' });
const response: Promise<ScoreboardResponse> = client.scoreboard.get();
void response;
`,
  );
  await writeFile(
    path.join(temporaryDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ['consumer.ts'],
      },
      null,
      2,
    )}\n`,
  );
  const typescriptCli = fileURLToPath(
    new URL('../node_modules/@typescript/native/bin/tsc', import.meta.url),
  );
  runNode([typescriptCli, '--project', 'tsconfig.json']);

  console.log('Installed-package JavaScript and TypeScript smokes passed.');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
