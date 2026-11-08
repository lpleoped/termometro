import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeLocalStorage } from '../storage/local-store';
import { evaluationRepository } from './evaluation.repository';
import { responseRepository } from './response.repository';
import { roundRepository } from './round.repository';
import { teamRepository } from './team.repository';
import { userRepository } from './user.repository';
import { assertRepositoryConformance } from './repository-conformance';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'termometro-repository-conformance-'));
process.env.STORAGE_DRIVER = 'json';
process.env.TERMOMETRO_DATA_DIR = directory;

async function run() {
  try {
    initializeLocalStorage();
    await assertRepositoryConformance({
      users: userRepository(), teams: teamRepository(), evaluations: evaluationRepository(),
      rounds: roundRepository(), responses: responseRepository(),
    });
    console.log('repository-conformance/json: ok');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

void run();
