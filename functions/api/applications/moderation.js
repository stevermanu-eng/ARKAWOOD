import { methodNotAllowed, submitApplication } from '../../_lib/applicationSubmission.js';

const schema = [
  { id: 'realName', category: 0, type: 'text', min: 2, max: 80 },
  { id: 'age', category: 0, type: 'number', minValue: 16, maxValue: 80, integer: true },
  { id: 'minecraftNick', category: 0, type: 'minecraft' },
  { id: 'country', category: 0, type: 'text', min: 2, max: 80 },
  { id: 'discordIdentity', category: 0, type: 'discord' },
  { id: 'phone', category: 0, type: 'phone' },
  { id: 'email', category: 0, type: 'email' },

  { id: 'minecraftTime', category: 1, type: 'text', min: 2, max: 1000 },
  { id: 'dailyHours', category: 1, type: 'text', min: 2, max: 1500 },
  { id: 'activeDays', category: 1, type: 'days' },
  { id: 'futureLimits', category: 1, type: 'text', min: 10, max: 5000 },
  { id: 'discordOutsideHours', category: 1, type: 'text', min: 10, max: 5000 },

  { id: 'moderationTools', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'previousModeration', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'ticketsKnowledge', category: 2, type: 'text', min: 15, max: 5000 },
  { id: 'recordingAnticheat', category: 2, type: 'text', min: 10, max: 5000 },
  { id: 'lagVsHacks', category: 2, type: 'text', min: 30, max: 5000 },

  { id: 'scenarioInsults', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioHacksNoProof', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioFriend', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioReports', category: 3, type: 'text', min: 30, max: 5000 },
  { id: 'scenarioAppeal', category: 3, type: 'text', min: 30, max: 5000 },

  { id: 'whyArkaWood', category: 4, type: 'text', min: 40, max: 5000 },
  { id: 'qualities', category: 4, type: 'text', min: 30, max: 5000 },
  { id: 'contribution', category: 4, type: 'text', min: 30, max: 5000 },
  { id: 'pressure', category: 4, type: 'text', min: 30, max: 5000 },

  { id: 'additionalSkills', category: 5, type: 'text', min: 5, max: 5000 },
  { id: 'anythingElse', category: 5, type: 'text', min: 5, max: 5000 }
];

export function onRequestPost(context) {
  return submitApplication(context, { branch: 'moderation', schema });
}

export function onRequestGet() {
  return methodNotAllowed();
}
