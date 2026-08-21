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
    "id": "minecraftBuildingTime",
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
    "id": "revisionCommitment",
    "category": 1,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "buildingStyles",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "previousBuilderExperience",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "buildingTools",
    "category": 2,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "strengthsWeaknesses",
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
    "id": "scenarioArtDirection",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioVisualConsistency",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioConceptStart",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioScaleIssue",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "scenarioQualityFeedback",
    "category": 3,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "whyBuilders",
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
    "id": "regionConcept",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "memorableBuild",
    "category": 4,
    "type": "text",
    "min": 2,
    "max": 5000
  },
  {
    "id": "additionalVisualSkills",
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
  return submitApplication(context, { branch: 'builders', schema });
}

export function onRequestGet() {
  return methodNotAllowed();
}
