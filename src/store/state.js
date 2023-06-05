import { get, writable, derived } from 'svelte/store';
import { wiModules, wiModes, wiIsExpert, wiStrings } from './webinterface';

export const dataLoaded = writable(false);

export const currentMode = writable('off');
export const currentValues = writable({});
export const expertTemplate = writable('');

export const currentOptions = derived([currentMode, expertTemplate], ([currentMode, expertTemplate]) => {
  const modeInfo = getModeInfoFor(currentMode);
  const template = getModeTemplateFor(currentMode, expertTemplate);

  const inputs = [...template.matchAll(/\{[ti][0-9]\:[0-9]+\}/ig)];
  const types = { t: "text", i: "number" };

  return inputs.map((input, i) => {
    const [prefix, size] = input[0].replace(/[\{\}]/g, "").split(":");
    return {
      title: (modeInfo.paramNames || [])[i] || input[0],
      template: input[0],
      valueType: types[prefix[0]],
      valueSize: size
    }
  });
});

export const currentTemplate = derived([currentMode, expertTemplate], ([currentMode, expertTemplate]) => {
  return getModeTemplateFor(currentMode, expertTemplate);
});

export const currentPreview = derived([currentMode, currentValues, expertTemplate, wiModules], ([currentMode, currentValues, expertTemplate, wiModules]) => {
  const template = getFilledTemplate(currentMode, currentValues, expertTemplate);
  if (wiModes === undefined) return template;

  const preview = JSON.parse(JSON.stringify(wiModules)); // deep copy
  let iterator = 0;

  for (let r = 0; r < preview.length; r++) {
    for (let c = 0; c < preview[r].length; c++) {
      preview[r][c] = template[iterator++] || " ";
    }
  }

  return preview;
});


function getModeInfoFor(mode) {
  return get(wiModes).filter((m) => m.mode === mode)[0] || {};
}

function getModeTemplateFor(mode, expertTemplate) {
  let template = getModeInfoFor(mode).template || "";

  if (get(wiIsExpert) && expertTemplate !== undefined && expertTemplate != "" && mode == "expert") {
    template = expertTemplate;
  }

  return template;
}

function getFilledTemplate(mode, values, expertTemplate) {
  let template = getModeTemplateFor(mode, expertTemplate);
  template = getFilledWithDynamic(template, values);
  template = getFilledWithConst(template, values);

  // All unresolved templates are simply ignored
  return template.replace(/\{[A-z0-9:]+\}/ig, '');
}

function getFilledWithConst(template, values) {
  return Object.keys(values).reduce((acc, v) => insertValueFor(acc, values, v), template);
}

function getFilledWithDynamic(template, _values) {
  const daysShort = get(wiStrings)["day-names-short"] || []
  const daysLong = get(wiStrings)["day-names-long"] || []
  const date = new Date();

  return template
    .replace("{YYYY}", date.getFullYear())
    .replace("{MM}", (date.getMonth() + 1 + "").padStart(2, "0"))
    .replace("{DD}", (date.getDate() + "").padStart(2, "0"))
    .replace("{WD}", daysShort[date.getDay()] || "XX")
    .replace("{WDD}", daysLong[date.getDay()] || "XXX")
    .replace("{hh}", (date.getHours() + "").padStart(2, "0"))
    .replace("{mm}", (date.getMinutes() + "").padStart(2, "0"))
    .replace("{ss}", (date.getSeconds() + "").padStart(2, "0"));
}

function insertValueFor(output, values, key) {
  const [prefix, size] = key.replace(/[\{\}]/g, "").split(":");
  const isTextInput = prefix[0] === "t";
  const isNumberInput = prefix[0] === "i";

  if (isTextInput) return output.replace(key, values[key]);
  if (isNumberInput) return output.replace(key, "#".repeat(size));
  return "";
}


// Reset all parameters when user changes mode
currentMode.subscribe((_) => currentValues.set({}));
