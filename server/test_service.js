import { getFeedbackStats } from './src/services/feedback.service.js';

async function main() {
  const stats = await getFeedbackStats(null);
  console.log(JSON.stringify({ success: true, data: { stats } }, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
