import { ESPNAPIError, ESPNClient } from 'espn-api-client';

async function main(): Promise<void> {
  // ESPNClient defaults to the NFL.
  const espn = new ESPNClient();
  const scoreboard = await espn.scoreboard.get({ limit: 5 });

  if (scoreboard.events.length === 0) {
    console.log('No NFL events were returned.');
    return;
  }

  for (const event of scoreboard.events) {
    console.log(`${event.id}: ${event.name}${event.date === undefined ? '' : ` (${event.date})`}`);
  }
}

void main().catch((error: unknown) => {
  if (error instanceof ESPNAPIError) {
    console.error(`ESPN request failed: ${error.code}`, {
      status: error.status,
      url: error.url,
      attempts: error.attempts,
    });
    process.exitCode = 1;
    return;
  }

  throw error;
});
