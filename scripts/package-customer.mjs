import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readCustomerBrand, readCustomerInstallation, sha256 } from '../build/customerBrand.ts';

const productDir = fileURLToPath(new URL('..', import.meta.url));

try {
  const { values } = parseArgs({ options: {
    'deploy-dir': { type: 'string' },
    instance: { type: 'string' },
    output: { type: 'string' },
    'app-tag': { type: 'string' },
    preview: { type: 'boolean' },
  } });
  const { instance, output, 'deploy-dir': deploy, 'app-tag': tag, preview } = values;
  if (!deploy || !output || !instance || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(instance) ||
      (preview && tag) || (!preview && !/^v\d+\.\d+\.\d+$/.test(tag ?? ''))) {
    throw new Error('Bruk --deploy-dir STI --instance ID --output STI og enten --preview eller --app-tag vX.Y.Z.');
  }

  const deployDir = realpathSync(deploy);
  const instanceFile = join(deployDir, 'installations', `${instance}.json`);
  const installation = readCustomerInstallation(instanceFile);
  if (installation.id !== instance) throw new Error('Instans-ID i fila stemmer ikke med --instance.');
  const profileDir = join(deployDir, 'profiles', installation.profile);
  const profile = readCustomerBrand(profileDir);
  if (profile.presentationOnly && !preview) {
    throw new Error('Presentasjonsprofiler kan bare bygges lokalt med --preview.');
  }
  const productCommit = git(productDir, 'rev-parse', 'HEAD');
  const deployCommit = preview ? previewCommit(deployDir) : git(deployDir, 'rev-parse', 'HEAD');

  if (!preview) {
    if (git(productDir, 'rev-parse', '--verify', `refs/tags/${tag}^{commit}`) !== productCommit) {
      throw new Error('Produktrepoets HEAD må være nøyaktig på den oppgitte Git-taggen.');
    }
    checkClean(productDir);
    checkClean(deployDir);
    // A gitignored local replacement must not become a shippable profile.
    for (const file of [`installations/${instance}.json`, ...['brand.json', profile.logoFileName, 'favicon.svg']
      .map((name) => `profiles/${installation.profile}/${name}`)]) {
      if (!lstatSync(join(deployDir, file)).isFile() || realpathSync(join(deployDir, file)) !== join(deployDir, file)) {
        throw new Error(`Pakking fra tag krever en vanlig fil i driftsrepoet: ${file}`);
      }
      git(deployDir, 'ls-files', '--error-unmatch', '--', file);
    }
  }

  const revision = installation.profile.split('/')[1];
  const packageName = `svario-${tag ?? `preview-${productCommit.slice(0, 8)}`}-${instance}-${revision}`;
  const outDir = resolve(output);
  const archive = join(outDir, `${packageName}.tar.gz`);
  if (existsSync(archive) || existsSync(`${archive}.sha256`)) {
    throw new Error('Pakkenavnet finnes allerede. Velg en ny utdatamappe.');
  }

  const workDir = mkdtempSync(join(tmpdir(), 'svario-customer-'));
  try {
    const stage = join(workDir, packageName);
    const web = join(stage, 'dist');
    const migrations = join(stage, 'supabase', 'migrations');
    run('npm', ['run', 'build', '--', '--mode', 'customer', '--outDir', web], {
      cwd: productDir,
      env: { ...process.env, SVARIO_CUSTOMER_PROFILE_DIR: profileDir, SVARIO_CUSTOMER_INSTANCE_FILE: instanceFile },
    });
    mkdirSync(migrations, { recursive: true });
    const migrationsDir = join(productDir, 'supabase', 'migrations');
    const migrationNames = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .map((entry) => entry.name).sort();
    if (!migrationNames.length) throw new Error('Fant ingen migrasjoner å pakke.');
    for (const file of migrationNames) {
      const relative = `supabase/migrations/${file}`;
      if (!preview) git(productDir, 'ls-files', '--error-unmatch', '--', relative);
      copyFileSync(join(migrationsDir, file), join(migrations, file));
    }

    writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify({
      schemaVersion: 1,
      releaseStatus: profile.presentationOnly ? 'presentation' : 'pilot',
      installableInProduction: false,
      preview: Boolean(preview),
      instance: installation.id,
      appTag: tag ?? null,
      productCommit,
      deployCommit,
      installationSha256: installation.sha256,
      profile: { ref: installation.profile, sha256: profile.sha256 },
      webOrigin: installation.supabaseUrl,
      migrations: migrationNames,
      edgeFunctions: [],
    }, null, 2)}\n`);
    run('tar', ['-czf', join(workDir, `${packageName}.tar.gz`), '-C', stage, 'dist', 'supabase', 'manifest.json']);
    mkdirSync(outDir, { recursive: true });
    const archivePath = join(workDir, `${packageName}.tar.gz`);
    const archiveSha = sha256(readFileSync(archivePath));
    copyFileSync(archivePath, archive);
    writeFileSync(`${archive}.sha256`, `${archiveSha}  ${packageName}.tar.gz\n`, { flag: 'wx' });
    console.log(`Pilotpakke: ${archive}\nProfil: ${installation.profile} (${profile.sha256})`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} feilet (kode ${result.status}).`);
}

function git(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args[0]} feilet i ${cwd}: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function checkClean(cwd) {
  if (git(cwd, 'status', '--porcelain', '--untracked-files=all')) {
    throw new Error(`Pakking fra tag krever en ren Git-arbeidsmappe: ${cwd}`);
  }
}

function previewCommit(cwd) {
  try {
    return git(cwd, 'rev-parse', '--verify', 'HEAD');
  } catch {
    return null;
  }
}
