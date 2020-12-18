// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
// Local modules.
import { getRaidBosses } from './raid';
import { getEvents } from './event';

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  const raidBosses = await getRaidBosses();
  await writeFile(`${outputPath}/raid-bosses.json`, JSON.stringify(raidBosses, null, 2));

  const events = await getEvents();
  await writeFile(`${outputPath}/events.json`, JSON.stringify(events, null, 2));
};

main();
