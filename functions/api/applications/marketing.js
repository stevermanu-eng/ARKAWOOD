import { methodNotAllowed, submitApplication } from '../../_lib/applicationSubmission.js';

const schema = [
  {
    "id": "realName",
    "category": 0,
    "type": "text",
    "min": 2,
    "max": 80
  },
  {
    "id": "age",
    "category": 0,
    "type": "number",
    "minValue": 1,
    "maxValue": 100,
    "integer": true
  },
  {
    "id": "minecraftNick",
    "category": 0,
    "type": "minecraft"
  },
  {
    "id": "country",
    "category": 0,
    "type": "text",
    "min": 2,
    "max": 80
  },
  {
    "id": "discordIdentity",
    "category": 0,
    "type": "discord"
  },
  {
    "id": "phone",
    "category": 0,
    "type": "phone"
  },
  {
    "id": "email",
    "category": 0,
    "type": "email"
  },
  {
    "id": "minecraftCommunityKnowledge",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "weeklyHours",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "availabilitySchedule",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "futureLimits",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "longTermStrategyCommitment",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "marketingExperience",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "platforms",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "marketingTools",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "campaignPlanning",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "portfolio",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioLowEngagement",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioFeatureDelay",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioNegativeComments",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioCreatorOffer",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioStrategyDisagreement",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "whyMarketing",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "qualities",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "launchCampaign",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "brandDifferentiation",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "additionalSkills",
    "category": 5,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "anythingElse",
    "category": 5,
    "type": "text",
    "min": 2,
    "max": 5000
  }
];

export function onRequestPost(context) {
  return submitApplication(context, { branch: 'marketing', schema });
}

export function onRequestGet() {
  return methodNotAllowed();
}
