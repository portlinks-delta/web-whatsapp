export const CONSTANTS = {
  INTITIAL_SETTINGS_STATE: {
    speed: "fast",
    waitBetweenStart: 5,
    waitBetweenEnd: 10,
    activateSleep: false,
    sleepAfterMessages: 0,
    sleepFor: 0,
  },
  VARIABLES: [
    { name: "fullname", link: "__fullname__" },
    { name: "firstname", link: "__firstname__" },
    { name: "lastname", link: "__lastname__" },
  ],
  FILE_TYPES: {
    photo: {
      acceptType: "image/jpeg,image/png",
      acceptSize: 5, //MB
    },
    audio: {
      acceptType: "audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg",
      acceptSize: 16,
    },
    video: {
      acceptType: "video/3gp,video/mp4",
      acceptSize: 16,
    },
    pdf: {
      acceptType: "application/pdf",
      acceptSize: 100,
    },
    document: {
      acceptType:
        "text/plain, application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
      acceptSize: 100,
    },
  },
};
