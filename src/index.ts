// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
// Local modules.
import { getRaidBosses } from './raid';
import { getEvents } from './event';
import { getResearches } from './research';
import { getEggs } from './egg';

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  // Raid Bosses.
  try {
    const raidBosses = await getRaidBosses();
    await writeFile(`${outputPath}/raid-bosses.json`, JSON.stringify(raidBosses, null, 2));
    await writeFile(`${outputPath}/raid-bosses.min.json`, JSON.stringify(raidBosses));
  } catch (e) {
    console.error(e);
  }

  // Events.
  try {
    const events = await getEvents();
    await writeFile(`${outputPath}/events.json`, JSON.stringify(events, null, 2));
    await writeFile(`${outputPath}/events.min.json`, JSON.stringify(events));
  } catch (e) {
    console.error(e);
  }

  // Researches.
  try {
    const researches = await getResearches();
    await writeFile(`${outputPath}/researches.json`, JSON.stringify(researches, null, 2));
    await writeFile(`${outputPath}/researches.min.json`, JSON.stringify(researches));
  } catch (e) {
    console.error(e);
  }

  // Eggs.
  try {
    const eggs = await getEggs();
    await writeFile(`${outputPath}/eggs.json`, JSON.stringify(eggs, null, 2));
    await writeFile(`${outputPath}/eggs.min.json`, JSON.stringify(eggs));
  } catch (e) {
    console.error(e);
  }
};

main();
