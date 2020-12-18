// Local modules.
import { getRaidBosses } from './raid';
import { getEvents } from './event';

const main = async () => {
  // const raidBosses = await getRaidBosses();
  // console.log('raidBosses', raidBosses);

  const events = await getEvents();
  console.log('events', events);
};

main();
